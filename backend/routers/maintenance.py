from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import MaintenanceRecord


router = APIRouter(
    prefix="/api/v1/maintenance",
    tags=["Maintenance"],
)


@router.get("/")
def get_maintenance_records(
    db: Session = Depends(get_db)
):
    records = (
        db.query(MaintenanceRecord)
        .order_by(MaintenanceRecord.maintenance_date.desc())
        .all()
    )

    return [
        {
            "id": record.id,
            "pump_id": record.pump_id,
            "maintenance_date": record.maintenance_date,
            "maintenance_type": record.maintenance_type,
            "description": record.description,
            "technician": record.technician,
            "status": record.status,
            "cost": record.cost,
        }
        for record in records
    ]


@router.post("/")
def create_maintenance_record(
    pump_id: int,
    maintenance_type: str,
    description: str = "",
    technician: str = "",
    status: str = "Completed",
    cost: float = 0.0,
    db: Session = Depends(get_db),
):
    record = MaintenanceRecord(
        pump_id=pump_id,
        maintenance_type=maintenance_type,
        description=description,
        technician=technician,
        status=status,
        cost=cost,
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "message": "Maintenance record created successfully",
        "id": record.id,
        "pump_id": record.pump_id,
        "maintenance_type": record.maintenance_type,
        "status": record.status,
        "cost": record.cost,
    }