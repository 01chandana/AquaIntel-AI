from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Pump, Telemetry
from health_score import calculate_health_score
from failure_prediction import predict_failure
from maintenance_recommendation import get_maintenance_recommendation


router = APIRouter(
    prefix="/api/v1/pumps",
    tags=["Pumps"],
)


@router.get("/")
def get_pumps(db: Session = Depends(get_db)):
    pumps = db.query(Pump).all()

    return [
        {
            "id": pump.id,
            "pump_id": pump.pump_id,
            "name": pump.name,
            "location": pump.location,
            "status": pump.status,
            "temperature": pump.temperature,
            "vibration": pump.vibration,
            "pressure": pump.pressure,
            "flow_rate": pump.flow_rate,
            "motor_current": pump.motor_current,
            "voltage": pump.voltage,
            "power_kw": pump.power_kw,
            "rpm": pump.rpm,
            "runtime_hours": pump.runtime_hours,
        }
        for pump in pumps
    ]


@router.get("/{pump_id}/health")
def get_pump_health(
    pump_id: int,
    db: Session = Depends(get_db)
):
    pump = (
        db.query(Pump)
        .filter(Pump.id == pump_id)
        .first()
    )

    if not pump:
        return {
            "message": "Pump not found"
        }

    latest_telemetry = (
        db.query(Telemetry)
        .filter(Telemetry.pump_id == pump_id)
        .order_by(Telemetry.timestamp.desc())
        .first()
    )

    if not latest_telemetry:
        return {
            "pump_id": pump.pump_id,
            "message": "No telemetry available"
        }

    health = calculate_health_score(latest_telemetry)

    return {
        "pump_id": pump.pump_id,
        "pump_name": pump.name,
        "health_score": health["health_score"],
        "status": health["status"],
        "timestamp": latest_telemetry.timestamp,
    }


@router.get("/{pump_id}/prediction")
def get_pump_prediction(
    pump_id: int,
    db: Session = Depends(get_db)
):
    pump = (
        db.query(Pump)
        .filter(Pump.id == pump_id)
        .first()
    )

    if not pump:
        return {
            "message": "Pump not found"
        }

    latest_telemetry = (
        db.query(Telemetry)
        .filter(Telemetry.pump_id == pump_id)
        .order_by(Telemetry.timestamp.desc())
        .first()
    )

    if not latest_telemetry:
        return {
            "pump_id": pump.pump_id,
            "message": "No telemetry available"
        }

    health = calculate_health_score(latest_telemetry)

    prediction = predict_failure(
        latest_telemetry,
        health["health_score"]
    )

    maintenance = get_maintenance_recommendation(
        latest_telemetry,
        health["health_score"],
        prediction["risk_level"]
    )

    return {
        "pump_id": pump.pump_id,
        "pump_name": pump.name,
        "health_score": health["health_score"],
        "health_status": health["status"],
        "failure_probability": prediction["failure_probability"],
        "risk_level": prediction["risk_level"],
        "maintenance": {
            "priority": maintenance["priority"],
            "recommendations": maintenance["recommendations"],
        },
        "timestamp": latest_telemetry.timestamp,
    }