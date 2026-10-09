from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Alert


router = APIRouter(
    prefix="/api/v1/alerts",
    tags=["Alerts"],
)


@router.get("/")
def get_alerts(db: Session = Depends(get_db)):
    alerts = (
        db.query(Alert)
        .order_by(Alert.timestamp.desc())
        .all()
    )

    return [
        {
            "id": alert.id,
            "pump_id": alert.pump_id,
            "timestamp": alert.timestamp,
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "message": alert.message,
            "status": alert.status,
            "value": alert.value,
            "threshold": alert.threshold,
        }
        for alert in alerts
    ]


@router.get("/{alert_id}")
def get_alert(
    alert_id: int,
    db: Session = Depends(get_db)
):
    alert = (
        db.query(Alert)
        .filter(Alert.id == alert_id)
        .first()
    )

    if not alert:
        return {
            "message": "Alert not found"
        }

    return {
        "id": alert.id,
        "pump_id": alert.pump_id,
        "timestamp": alert.timestamp,
        "alert_type": alert.alert_type,
        "severity": alert.severity,
        "message": alert.message,
        "status": alert.status,
        "value": alert.value,
        "threshold": alert.threshold,
    }


@router.post("/{alert_id}/acknowledge")
def acknowledge_alert(
    alert_id: int,
    db: Session = Depends(get_db)
):
    alert = (
        db.query(Alert)
        .filter(Alert.id == alert_id)
        .first()
    )

    if not alert:
        return {
            "message": "Alert not found"
        }

    alert.status = "Acknowledged"

    db.commit()
    db.refresh(alert)

    return {
        "message": "Alert acknowledged successfully",
        "id": alert.id,
        "pump_id": alert.pump_id,
        "alert_type": alert.alert_type,
        "severity": alert.severity,
        "status": alert.status,
    }


@router.post("/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db)
):
    alert = (
        db.query(Alert)
        .filter(Alert.id == alert_id)
        .first()
    )

    if not alert:
        return {
            "message": "Alert not found"
        }

    alert.status = "Resolved"

    db.commit()
    db.refresh(alert)

    return {
        "message": "Alert resolved successfully",
        "id": alert.id,
        "pump_id": alert.pump_id,
        "alert_type": alert.alert_type,
        "severity": alert.severity,
        "status": alert.status,
    }