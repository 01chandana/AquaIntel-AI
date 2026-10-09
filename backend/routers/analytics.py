from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Pump, Alert, MaintenanceRecord


router = APIRouter(
    prefix="/api/v1/analytics",
    tags=["Analytics"],
)


@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db)
):
    total_pumps = db.query(Pump).count()

    active_pumps = (
        db.query(Pump)
        .filter(Pump.status == "active")
        .count()
    )

    total_alerts = db.query(Alert).count()

    active_alerts = (
        db.query(Alert)
        .filter(Alert.status != "Resolved")
        .count()
    )

    total_maintenance = (
        db.query(MaintenanceRecord).count()
    )

    return {
        "total_pumps": total_pumps,
        "active_pumps": active_pumps,
        "total_alerts": total_alerts,
        "active_alerts": active_alerts,
        "total_maintenance_records": total_maintenance,
    }