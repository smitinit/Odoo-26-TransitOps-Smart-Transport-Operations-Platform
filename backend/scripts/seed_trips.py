"""Seed sample trips for Trip Dispatcher."""
import asyncio
import sys
import os
from datetime import datetime, timedelta, timezone

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database.session import AsyncSessionLocal
from app.database import base  # noqa: F401
from app.modules.fleet.models import Vehicle, VehicleStatus
from app.modules.drivers.models import Driver, DriverStatus
from app.modules.trips.models import Trip, TripStatus


async def seed_trips():
    async with AsyncSessionLocal() as session:
        vehicles = (
            await session.execute(select(Vehicle).where(Vehicle.deleted_at.is_(None)))
        ).scalars().all()
        drivers = (
            await session.execute(select(Driver).where(Driver.deleted_at.is_(None)))
        ).scalars().all()

        by_plate = {v.license_plate: v for v in vehicles}
        by_license = {d.license_number: d for d in drivers}

        van = by_plate.get("GJ01AB452")
        truck = by_plate.get("GJ01AB998")
        alex = by_license.get("DL-88213")
        suresh = by_license.get("DL-90045")
        priya = by_license.get("DL-77031")

        if not van or not alex:
            print("Missing seed vehicles/drivers. Run seed_vehicles + seed_drivers first.")
            return

        now = datetime.now(timezone.utc)
        created = 0

        async def ensure_trip(**kwargs):
            nonlocal created
            origin = kwargs["origin"]
            destination = kwargs["destination"]
            status = kwargs["status"]
            existing = await session.execute(
                select(Trip).where(
                    Trip.origin == origin,
                    Trip.destination == destination,
                    Trip.status == status,
                )
            )
            if existing.scalar_one_or_none():
                print(f"skip {origin}->{destination} ({status.value})")
                return
            session.add(Trip(**kwargs))
            created += 1

        await ensure_trip(
            vehicle_id=van.id,
            driver_id=alex.id,
            origin="Mumbai",
            destination="Pune",
            start_time=now + timedelta(hours=6),
            end_time=now + timedelta(hours=10),
            load_type="Parcels",
            cargo_weight_kg=450,
            planned_distance_km=150,
            status=TripStatus.PLANNED,
        )

        if truck and priya:
            await ensure_trip(
                vehicle_id=truck.id,
                driver_id=priya.id,
                origin="Ahmedabad",
                destination="Surat",
                start_time=now - timedelta(hours=2),
                end_time=now + timedelta(hours=3),
                load_type="Industrial goods",
                cargo_weight_kg=3200,
                planned_distance_km=265,
                status=TripStatus.IN_PROGRESS,
            )
            truck.status = VehicleStatus.ON_TRIP
            priya.status = DriverStatus.ON_TRIP
            session.add(truck)
            session.add(priya)

        if suresh:
            await ensure_trip(
                vehicle_id=van.id,
                driver_id=suresh.id,
                origin="Nashik",
                destination="Mumbai",
                start_time=now - timedelta(days=1),
                end_time=now - timedelta(hours=18),
                load_type="Retail",
                cargo_weight_kg=380,
                planned_distance_km=170,
                status=TripStatus.COMPLETED,
            )

        await session.commit()
        print(f"Seeded {created} trips.")


if __name__ == "__main__":
    asyncio.run(seed_trips())
