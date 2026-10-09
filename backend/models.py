from datetime import datetime

from sqlalchemy import Column, Integer, String, Float, DateTime

from database import Base


class Pump(Base):
    __tablename__ = "pumps"

    id = Column(Integer, primary_key=True, index=True)
    pump_id = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    location = Column(String(100), nullable=True)
    status = Column(String(20), default="active", nullable=False)

    temperature = Column(Float, nullable=True)
    vibration = Column(Float, nullable=True)
    pressure = Column(Float, nullable=True)
    flow_rate = Column(Float, nullable=True)
    motor_current = Column(Float, nullable=True)
    voltage = Column(Float, nullable=True)
    power_kw = Column(Float, nullable=True)
    rpm = Column(Float, nullable=True)
    runtime_hours = Column(Float, default=0.0)


class Telemetry(Base):
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, index=True)

    pump_id = Column(Integer, nullable=False, index=True)

    timestamp = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    temperature = Column(Float, nullable=False)
    vibration = Column(Float, nullable=False)
    pressure = Column(Float, nullable=False)
    flow_rate = Column(Float, nullable=False)
    motor_current = Column(Float, nullable=False)
    voltage = Column(Float, nullable=False)
    power_kw = Column(Float, nullable=False)
    rpm = Column(Float, nullable=False)
    runtime_hours = Column(Float, nullable=False)


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)

    pump_id = Column(Integer, nullable=False, index=True)

    timestamp = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    alert_type = Column(String(50), nullable=False)

    severity = Column(String(20), nullable=False)

    message = Column(String(255), nullable=False)

    status = Column(
        String(30),
        default="Triggered",
        nullable=False
    )

    value = Column(Float, nullable=True)

    threshold = Column(Float, nullable=True)

class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    id = Column(Integer, primary_key=True, index=True)

    pump_id = Column(Integer, nullable=False, index=True)

    maintenance_date = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    maintenance_type = Column(
        String(100),
        nullable=False
    )

    description = Column(
        String(500),
        nullable=True
    )

    technician = Column(
        String(100),
        nullable=True
    )

    status = Column(
        String(30),
        default="Completed",
        nullable=False
    )

    cost = Column(
        Float,
        nullable=True
    )