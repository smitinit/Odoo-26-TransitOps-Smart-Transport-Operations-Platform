"""Seed sample drivers matching the Drivers & Safety Profiles mockup."""
import asyncio
import sys
import os
from datetime import date

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database.session import AsyncSessionLocal
from app.database import base  # noqa: F401 — register all models for FK resolution
from app.modules.drivers.models import Driver, DriverStatus

SAMPLE_DRIVERS = [
    {
        "first_name": "Alex",
        "last_name": "Fernandez",
        "license_number": "DL-88213",
        "license_category": "LMV",
        "license_expiry": date(2028, 12, 31),
        "contact_number": "9876543210",
        "safety_score": 96,
        "trip_completion_pct": 96.0,
        "status": DriverStatus.AVAILABLE,
    },
    {
        "first_name": "John",
        "last_name": "D'Souza",
        "license_number": "DL-44120",
        "license_category": "HMV",
        "license_expiry": date(2025, 3, 31),
        "contact_number": "9820011223",
        "safety_score": 81,
        "trip_completion_pct": 81.0,
        "status": DriverStatus.SUSPENDED,
    },
    {
        "first_name": "Priya",
        "last_name": "Nair",
        "license_number": "DL-77031",
        "license_category": "LMV",
        "license_expiry": date(2021, 8, 31),
        "contact_number": "9911122233",
        "safety_score": 88,
        "trip_completion_pct": None,
        "status": DriverStatus.ON_TRIP,
    },
    {
        "first_name": "Suresh",
        "last_name": "Patil",
        "license_number": "DL-90045",
        "license_category": "HMV",
        "license_expiry": date(2027, 1, 31),
        "contact_number": "9744055667",
        "safety_score": 83,
        "trip_completion_pct": 83.0,
        "status": DriverStatus.OFF_DUTY,
    },
]


async def seed_drivers():
    async with AsyncSessionLocal() as session:
        created = 0
        for data in SAMPLE_DRIVERS:
            existing = await session.execute(
                select(Driver).where(Driver.license_number == data["license_number"])
            )
            if existing.scalar_one_or_none():
                print(f"skip {data['license_number']} (already exists)")
                continue
            session.add(Driver(**data))
            created += 1
        await session.commit()
        print(f"Seeded {created} drivers.")


if __name__ == "__main__":
    asyncio.run(seed_drivers())
