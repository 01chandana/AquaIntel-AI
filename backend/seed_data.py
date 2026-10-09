from database import SessionLocal, Base, engine
from models import Pump


# Make sure the database table exists
Base.metadata.create_all(bind=engine)


def seed_pumps():
    db = SessionLocal()

    try:
        # Check whether pumps already exist
        existing_pumps = db.query(Pump).count()

        if existing_pumps > 0:
            print("Pumps already exist. No new pumps added.")
            return

        pumps = []

        # Create 10 simulated pumps: P-001 to P-010
        for number in range(1, 11):
            pump = Pump(
                pump_id=f"P-{number:03d}",
                name=f"Water Pump {number}",
                location=f"Station {number}",
                status="active",
                temperature=55.0,
                vibration=2.5,
                pressure=5.0,
                flow_rate=115.0,
                motor_current=25.0,
                voltage=400.0,
                power_kw=17.5,
                rpm=1600.0,
                runtime_hours=0.0,
            )

            pumps.append(pump)

        # Add all pumps to database
        db.add_all(pumps)
        db.commit()

        print("Successfully created 10 pumps.")
        print()

        for pump in pumps:
            print(f"{pump.pump_id} - {pump.name}")

    except Exception as error:
        db.rollback()
        print(f"Error while creating pumps: {error}")

    finally:
        db.close()


if __name__ == "__main__":
    seed_pumps()