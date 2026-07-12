"""Seed sample vehicles matching the Fleet registry mockup."""
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database.session import AsyncSessionLocal
from app.modules.fleet.models import Vehicle, VehicleStatus

SAMPLE_VEHICLES = [
    {
        "vin": "VINMOCKGJ01AB4521",
        "license_plate": "GJ01AB452",
        "make": "Force",
        "model": "VAN-05",
        "year": 2022,
        "vehicle_type": "Van",
        "capacity": "500 kg",
        "odometer": 74000,
        "acquisition_cost": 620000,
        "status": VehicleStatus.ACTIVE,
    },
    {
        "vin": "VINMOCKGJ01AB9982",
        "license_plate": "GJ01AB998",
        "make": "Tata",
        "model": "TRUCK-11",
        "year": 2021,
        "vehicle_type": "Truck",
        "capacity": "5 Ton",
        "odometer": 182000,
        "acquisition_cost": 2450000,
        "status": VehicleStatus.ON_TRIP,
    },
    {
        "vin": "VINMOCKGJ01AB1120",
        "license_plate": "GJ01AB1120",
        "make": "Mahindra",
        "model": "MINI-03",
        "year": 2023,
        "vehicle_type": "Mini",
        "capacity": "1 Ton",
        "odometer": 66000,
        "acquisition_cost": 410000,
        "status": VehicleStatus.MAINTENANCE,
    },
    {
        "vin": "VINMOCKGJ01AB0083",
        "license_plate": "GJ01AB008",
        "make": "Force",
        "model": "VAN-09",
        "year": 2019,
        "vehicle_type": "Van",
        "capacity": "750 kg",
        "odometer": 241900,
        "acquisition_cost": 590000,
        "status": VehicleStatus.INACTIVE,
    },
]


async def seed_vehicles():
    async with AsyncSessionLocal() as session:
        created = 0
        for data in SAMPLE_VEHICLES:
            existing = await session.execute(
                select(Vehicle).where(Vehicle.license_plate == data["license_plate"])
            )
            if existing.scalar_one_or_none():
                print(f"skip {data['license_plate']} (already exists)")
                continue
            session.add(Vehicle(**data))
            created += 1
        await session.commit()
        print(f"Seeded {created} vehicles.")


if __name__ == "__main__":
    asyncio.run(seed_vehicles())
