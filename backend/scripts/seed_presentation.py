"""Wipe ops tables and seed rich presentation data for charts / KPIs.

Creates realistic Gujarat–Maharashtra logistics activity over the last ~6 months.
Run after migrations:

    python scripts/seed_presentation.py

Also ensures prod demo users (via seed_roles):
  fleet-prod@transitops.com / role@123
  driver-prod@transitops.com / role@123
  safety-prod@transitops.com / role@123
  finance-prod@transitops.com / role@123
"""
from __future__ import annotations

import asyncio
import os
import random
import sys
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import delete, select

from app.database import base  # noqa: F401
from app.database.session import AsyncSessionLocal
from app.modules.drivers.models import Driver, DriverStatus
from app.modules.finance.models import Expense, ExpenseType, FuelLog
from app.modules.fleet.models import Vehicle, VehicleStatus
from app.modules.maintenance.models import Maintenance, MaintenanceStatus
from app.modules.trips.models import Trip, TripStatus
from app.modules.users.models import User

from seed_roles import seed_data as seed_roles

random.seed(42)

CITIES = [
    "Ahmedabad",
    "Gandhinagar",
    "Vadodara",
    "Surat",
    "Rajkot",
    "Mumbai",
    "Pune",
    "Nashik",
    "Thane",
    "Bhavnagar",
]

LOAD_TYPES = [
    "Parcels",
    "FMCG",
    "Pharma cold-chain",
    "Industrial goods",
    "Retail restock",
    "E-commerce",
    "Auto parts",
]


VEHICLES = [
    ("GJ01AB4521", "Force", "Traveller", "Van", "800 kg", 620000, VehicleStatus.ACTIVE),
    ("GJ01CD8832", "Tata", "Ace Gold", "Mini", "1 Ton", 410000, VehicleStatus.ACTIVE),
    ("GJ01EF2291", "Ashok Leyland", "Dost+", "Mini", "1.25 Ton", 685000, VehicleStatus.ON_TRIP),
    ("GJ01GH4410", "Tata", "407 Gold", "Truck", "3 Ton", 1450000, VehicleStatus.ACTIVE),
    ("GJ01JK7788", "Mahindra", "Bolero Pickup", "Mini", "1 Ton", 520000, VehicleStatus.MAINTENANCE),
    ("GJ01LM9901", "Eicher", "Pro 2049", "Truck", "5 Ton", 2450000, VehicleStatus.ON_TRIP),
    ("GJ01NP1120", "Force", "Traveller 12", "Van", "1 Ton", 780000, VehicleStatus.ACTIVE),
    ("GJ01QR3344", "Tata", "Ultra 1518", "Truck", "7 Ton", 2850000, VehicleStatus.ACTIVE),
    ("GJ01ST5566", "Mahindra", "Jeeto", "Mini", "600 kg", 355000, VehicleStatus.INACTIVE),
    ("GJ01UV7780", "Ashok Leyland", "Bada Dost", "Truck", "2.5 Ton", 1180000, VehicleStatus.ACTIVE),
    ("MH12WX9012", "Tata", "Yodha", "Pickup", "1.5 Ton", 890000, VehicleStatus.ACTIVE),
    ("MH14YZ3456", "Force", "Traveller", "Van", "900 kg", 710000, VehicleStatus.ON_TRIP),
]


DRIVERS = [
    ("Arjun", "Patel", "DL-GJ-88421", "HMV", 94, 97.0, DriverStatus.ON_TRIP, 400),
    ("Kavya", "Shah", "DL-GJ-55210", "LMV", 91, 95.0, DriverStatus.AVAILABLE, 500),
    ("Rohan", "Mehta", "DL-GJ-33118", "HMV", 78, 82.0, DriverStatus.SUSPENDED, -40),
    ("Isha", "Desai", "DL-GJ-91044", "LMV", 88, 90.0, DriverStatus.AVAILABLE, 25),
    ("Vikram", "Joshi", "DL-GJ-22019", "HMV", 85, 88.0, DriverStatus.ON_TRIP, 200),
    ("Sneha", "Nair", "DL-MH-66772", "LMV", 96, 98.0, DriverStatus.AVAILABLE, 600),
    ("Amit", "Kulkarni", "DL-MH-44881", "HMV", 72, 75.0, DriverStatus.OFF_DUTY, -10),
    ("Priya", "Rao", "DL-GJ-10028", "LMV", 83, 86.0, DriverStatus.AVAILABLE, 15),
    ("Farhan", "Qureshi", "DL-GJ-77330", "HMV", 89, 92.0, DriverStatus.ON_TRIP, 300),
    ("Neel", "Trivedi", "DL-GJ-55991", "LMV", 80, None, DriverStatus.AVAILABLE, -5),
]


async def _clear_ops(session) -> None:
    """Remove operational rows so presentation data is clean."""
    # Order matters for FKs (expenses reference trips/vehicles)
    await session.execute(delete(Expense))
    await session.execute(delete(FuelLog))
    await session.execute(delete(Maintenance))
    await session.execute(delete(Trip))
    # Soft-clear prior demo fleet/drivers (keep linked users intact)
    await session.execute(delete(Driver))
    await session.execute(delete(Vehicle))
    await session.commit()
    print("Cleared trips, fuel, expenses, maintenance, drivers, vehicles.")


def _capacity_kg(capacity: str) -> float:
    match = capacity.lower().replace(",", "")
    if "ton" in match or match.endswith("t"):
        num = float("".join(c for c in match if c.isdigit() or c == ".") or "1")
        return num * 1000
    num = float("".join(c for c in match if c.isdigit() or c == ".") or "500")
    return num


async def seed_presentation():
    async with AsyncSessionLocal() as session:
        await _clear_ops(session)

        today = date.today()
        now = datetime.now(timezone.utc)

        vehicles: list[Vehicle] = []
        for i, (plate, make, model, vtype, capacity, cost, status) in enumerate(VEHICLES):
            v = Vehicle(
                vin=f"VINPRES{plate.replace('-', '')}{i:02d}",
                license_plate=plate,
                make=make,
                model=model,
                year=2019 + (i % 6),
                vehicle_type=vtype if vtype != "Pickup" else "Mini",
                capacity=capacity,
                odometer=35000 + i * 14000 + random.randint(0, 8000),
                acquisition_cost=Decimal(cost),
                status=status,
            )
            session.add(v)
            vehicles.append(v)
        await session.flush()
        print(f"Seeded {len(vehicles)} vehicles.")

        drivers: list[Driver] = []
        for i, (fn, ln, lic, cat, score, pct, status, expiry_offset) in enumerate(DRIVERS):
            expiry = today + timedelta(days=expiry_offset)
            d = Driver(
                first_name=fn,
                last_name=ln,
                license_number=lic,
                license_category=cat,
                license_expiry=expiry,
                contact_number=f"98{10000000 + i * 1111}",
                safety_score=score,
                trip_completion_pct=pct,
                status=status,
            )
            session.add(d)
            drivers.append(d)
        await session.flush()
        print(f"Seeded {len(drivers)} drivers.")

        # Link driver-prod user if present
        prod_driver_user = (
            await session.execute(
                select(User).where(User.email == "driver-prod@transitops.com")
            )
        ).scalar_one_or_none()
        on_trip_driver = next(
            (d for d in drivers if d.status == DriverStatus.ON_TRIP), drivers[0]
        )
        if prod_driver_user:
            on_trip_driver.user_id = prod_driver_user.id
            session.add(on_trip_driver)

        # --- Trips across last 6 months + live board ---
        active_vehicles = [v for v in vehicles if v.status != VehicleStatus.INACTIVE]
        trip_count = 0
        completed_trips: list[Trip] = []

        # Historical completed trips (feed utilization, regions, finance)
        for day_back in range(1, 170):
            if day_back % 3 != 0:
                continue
            day = today - timedelta(days=day_back)
            n = 1 + (day_back % 3)
            for j in range(n):
                origin, dest = random.sample(CITIES, 2)
                vehicle = active_vehicles[(day_back + j) % len(active_vehicles)]
                driver = drivers[(day_back + j * 2) % len(drivers)]
                start = datetime(
                    day.year, day.month, day.day, 6 + j, 0, tzinfo=timezone.utc
                )
                distance = 80 + (day_back * 7 + j * 13) % 320
                cargo = min(_capacity_kg(vehicle.capacity) * 0.7, 4500)
                trip = Trip(
                    vehicle_id=vehicle.id,
                    driver_id=driver.id,
                    origin=origin,
                    destination=dest,
                    start_time=start,
                    end_time=start + timedelta(hours=3 + (j % 5)),
                    load_type=LOAD_TYPES[(day_back + j) % len(LOAD_TYPES)],
                    cargo_weight_kg=round(cargo, 1),
                    planned_distance_km=float(distance),
                    status=TripStatus.COMPLETED,
                )
                session.add(trip)
                completed_trips.append(trip)
                trip_count += 1

        # Live / upcoming trips for dispatcher
        live_specs = [
            (TripStatus.IN_PROGRESS, -4, 5, 0),
            (TripStatus.IN_PROGRESS, -2, 4, 1),
            (TripStatus.IN_PROGRESS, -1, 6, 2),
            (TripStatus.PLANNED, 3, 8, 3),
            (TripStatus.PLANNED, 8, 12, 4),
            (TripStatus.PLANNED, 20, 28, 5),
            (TripStatus.CANCELLED, -10, -8, 6),
        ]
        on_trip_pairs = [
            (v, d)
            for v, d in zip(
                [v for v in vehicles if v.status == VehicleStatus.ON_TRIP],
                [d for d in drivers if d.status == DriverStatus.ON_TRIP],
            )
        ]
        for idx, (status, start_h, end_h, offset) in enumerate(live_specs):
            origin, dest = CITIES[idx % len(CITIES)], CITIES[(idx + 3) % len(CITIES)]
            if status == TripStatus.IN_PROGRESS and on_trip_pairs:
                vehicle, driver = on_trip_pairs[idx % len(on_trip_pairs)]
            else:
                vehicle = active_vehicles[offset % len(active_vehicles)]
                driver = drivers[offset % len(drivers)]
            start = now + timedelta(hours=start_h)
            trip = Trip(
                vehicle_id=vehicle.id,
                driver_id=driver.id,
                origin=origin,
                destination=dest,
                start_time=start,
                end_time=now + timedelta(hours=end_h),
                load_type=LOAD_TYPES[idx % len(LOAD_TYPES)],
                cargo_weight_kg=min(_capacity_kg(vehicle.capacity) * 0.65, 4000),
                planned_distance_km=float(120 + idx * 35),
                status=status,
            )
            session.add(trip)
            trip_count += 1
            if status == TripStatus.COMPLETED:
                completed_trips.append(trip)

        await session.flush()
        print(f"Seeded {trip_count} trips.")

        # --- Maintenance (open + historical for cost charts) ---
        maint_count = 0
        for i, vehicle in enumerate(vehicles):
            # Historical completed jobs across months
            for m_back in range(0, 6):
                sched = (today.replace(day=1) - timedelta(days=30 * m_back)) + timedelta(
                    days=5 + (i % 10)
                )
                session.add(
                    Maintenance(
                        vehicle_id=vehicle.id,
                        maintenance_type=["Oil Change", "Brake Service", "Tire Rotation", "AC Service", "Battery Check"][
                            (i + m_back) % 5
                        ],
                        description=f"Scheduled service for {vehicle.license_plate}",
                        scheduled_date=sched,
                        cost=1500 + (i * 400) + m_back * 650 + random.randint(0, 900),
                        status=MaintenanceStatus.COMPLETED,
                    )
                )
                maint_count += 1

        # Open shop jobs for near-maintenance KPI
        shop = next(v for v in vehicles if v.status == VehicleStatus.MAINTENANCE)
        session.add(
            Maintenance(
                vehicle_id=shop.id,
                maintenance_type="Clutch Overhaul",
                description="Clutch plate replacement — bay 2",
                scheduled_date=today + timedelta(days=1),
                cost=18500,
                status=MaintenanceStatus.IN_PROGRESS,
            )
        )
        maint_count += 1
        session.add(
            Maintenance(
                vehicle_id=vehicles[0].id,
                maintenance_type="Oil Change",
                description="Due this fortnight",
                scheduled_date=today + timedelta(days=5),
                cost=3200,
                status=MaintenanceStatus.SCHEDULED,
            )
        )
        maint_count += 1
        await session.flush()
        print(f"Seeded {maint_count} maintenance records.")

        # --- Fuel logs across months (rising ops cost trend) ---
        fuel_count = 0
        for day_back in range(0, 180):
            if day_back % 4 != 0:
                continue
            day = today - timedelta(days=day_back)
            for j, vehicle in enumerate(active_vehicles[:8]):
                if (day_back + j) % 5 == 0:
                    continue
                liters = 28 + (j * 9) + (day_back % 17)
                # Slight upward fuel price pressure
                rate = 78 + (180 - day_back) * 0.02 + (j % 3)
                session.add(
                    FuelLog(
                        vehicle_id=vehicle.id,
                        gallons=float(liters),
                        cost=round(liters * rate, 0),
                        date_filled=day,
                    )
                )
                fuel_count += 1
        await session.flush()
        print(f"Seeded {fuel_count} fuel logs.")

        # --- Trip expenses ---
        exp_count = 0
        all_trips = (await session.execute(select(Trip))).scalars().all()
        for t in all_trips:
            if t.status == TripStatus.CANCELLED:
                continue
            day = t.start_time.astimezone(timezone.utc).date()
            session.add(
                Expense(
                    vehicle_id=t.vehicle_id,
                    trip_id=t.id,
                    expense_type=ExpenseType.TOLL,
                    amount=350 + (hash(str(t.id)) % 700),
                    date_incurred=day,
                    description="Highway / expressway toll",
                )
            )
            exp_count += 1
            if t.status == TripStatus.COMPLETED:
                session.add(
                    Expense(
                        vehicle_id=t.vehicle_id,
                        trip_id=t.id,
                        expense_type=ExpenseType.OTHER,
                        amount=180 + (hash(str(t.id)[::-1]) % 220),
                        date_incurred=day,
                        description="Driver meal / incidental",
                    )
                )
                exp_count += 1

        await session.commit()
        print(f"Seeded {exp_count} expenses.")
        print("Presentation ops data ready.")


async def main():
    print("=== Seeding roles + prod demo users ===")
    await seed_roles()
    print("=== Seeding presentation fleet / trips / costs ===")
    await seed_presentation()
    # Re-link driver-prod after vehicle wipe (seed_roles ran first)
    async with AsyncSessionLocal() as session:
        user = (
            await session.execute(
                select(User).where(User.email == "driver-prod@transitops.com")
            )
        ).scalar_one_or_none()
        driver = (
            await session.execute(
                select(Driver).where(Driver.license_number == "DL-GJ-88421")
            )
        ).scalar_one_or_none()
        if user and driver:
            driver.user_id = user.id
            # Clear other drivers pointing to same user
            others = (
                await session.execute(
                    select(Driver).where(
                        Driver.user_id == user.id, Driver.id != driver.id
                    )
                )
            ).scalars().all()
            for o in others:
                o.user_id = None
                session.add(o)
            session.add(driver)
            await session.commit()
            print(f"Linked driver-prod → {driver.first_name} {driver.last_name} (ON_TRIP).")
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
