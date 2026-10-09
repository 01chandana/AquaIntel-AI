from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Telemetry
from alert_engine import check_telemetry_rules
from anomaly_detection import detect_anomaly


router = APIRouter(
    prefix="/api/v1/telemetry",
    tags=["Telemetry"],
)


@router.get("/")
def get_telemetry(db: Session = Depends(get_db)):
    telemetry = (
        db.query(Telemetry)
        .order_by(Telemetry.timestamp.desc())
        .all()
    )

    return [
        {
            "id": item.id,
            "pump_id": item.pump_id,
            "timestamp": item.timestamp,
            "temperature": item.temperature,
            "vibration": item.vibration,
            "pressure": item.pressure,
            "flow_rate": item.flow_rate,
            "motor_current": item.motor_current,
            "voltage": item.voltage,
            "power_kw": item.power_kw,
            "rpm": item.rpm,
            "runtime_hours": item.runtime_hours,
        }
        for item in telemetry
    ]


@router.post("/")
def create_telemetry(
    pump_id: int,
    temperature: float,
    vibration: float,
    pressure: float,
    flow_rate: float,
    motor_current: float,
    voltage: float,
    power_kw: float,
    rpm: float,
    runtime_hours: float,
    db: Session = Depends(get_db),
):
    telemetry = Telemetry(
        pump_id=pump_id,
        timestamp=datetime.utcnow(),
        temperature=temperature,
        vibration=vibration,
        pressure=pressure,
        flow_rate=flow_rate,
        motor_current=motor_current,
        voltage=voltage,
        power_kw=power_kw,
        rpm=rpm,
        runtime_hours=runtime_hours,
    )

    db.add(telemetry)
    db.commit()
    db.refresh(telemetry)

    # Rule-based alert detection
    alerts = check_telemetry_rules(db, telemetry)

    # AI anomaly detection
    anomaly = detect_anomaly(telemetry)

    # Save generated alerts
    db.commit()

    return {
        "message": "Telemetry created successfully",
        "id": telemetry.id,
        "pump_id": telemetry.pump_id,
        "timestamp": telemetry.timestamp,
        "alerts_created": len(alerts),
        "anomaly_status": anomaly["status"],
        "anomaly_score": anomaly["anomaly_score"],
    }