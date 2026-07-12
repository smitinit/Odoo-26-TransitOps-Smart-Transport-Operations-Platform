"""Seed sample maintenance records."""
import asyncio
import sys
import os
from datetime import date, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database.session import AsyncSessionLocal
from app.database import base  # noqa: F401
from app.modules.fleet.models import Vehicle, VehicleStatus
from app.modules.maintenance.models import Maintenance, MaintenanceStatus


async def seed_maintenance():
    async with AsyncSessionLocal() as session:
        vehicles = (
            await session.execute(select(Vehicle).where(Vehicle.deleted_at.is_(None)))
        ).scalars().all()
        by_plate = {v.license_plate: v for v in vehicles}

        mini = by_plate.get("GJ01AB1120")  # already In Shop in fleet seed
        van = by_plate.get("GJ01AB452")
        truck = by_plate.get("GJ01AB998")

        if not mini and not van:
            print("Missing vehicles. Run seed_vehicles first.")
            return

        created = 0

        async def ensure(**kwargs):
            nonlocal created
            existing = await session.execute(
                select(Maintenance).where(
                    Maintenance.vehicle_id == kwargs["vehicle_id"],
                    Maintenance.maintenance_type == kwargs["maintenance_type"],
                    Maintenance.scheduled_date == kwargs["scheduled_date"],
                )
            )
            if existing.scalar_one_or_none():
                print(f"skip {kwargs['maintenance_type']} on {kwargs['scheduled_date']}")
                return
            session.add(Maintenance(**kwargs))
            created += 1

        today = date.today()

        if mini:
            await ensure(
                vehicle_id=mini.id,
                maintenance_type="Oil Change",
                description="Routine oil and filter service",
                scheduled_date=today + timedelta(days=3),
                cost=2500,
                status=MaintenanceStatus.SCHEDULED,
            )
            mini.status = VehicleStatus.MAINTENANCE
            session.add(mini)

        if van:
            await ensure(
                vehicle_id=van.id,
                maintenance_type="Tire Rotation",
                description="Rotate all four tires",
                scheduled_date=today - timedelta(days=2),
                cost=1800,
                status=MaintenanceStatus.IN_PROGRESS,
            )

        if truck:
            await ensure(
                vehicle_id=truck.id,
                maintenance_type="Brake Service",
                description="Front pad replacement",
                scheduled_date=today - timedelta(days=20),
                cost=8500,
                status=MaintenanceStatus.COMPLETED,
            )

        await session.commit()
        print(f"Seeded {created} maintenance records.")


if __name__ == "__main__":
    asyncio.run(seed_maintenance())
