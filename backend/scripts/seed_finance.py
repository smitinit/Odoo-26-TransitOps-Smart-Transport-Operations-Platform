"""Seed sample fuel logs and trip expenses."""
import asyncio
import sys
import os
from datetime import date, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database.session import AsyncSessionLocal
from app.database import base  # noqa: F401
from app.modules.fleet.models import Vehicle
from app.modules.trips.models import Trip, TripStatus
from app.modules.finance.models import Expense, FuelLog, ExpenseType
from app.modules.maintenance.models import Maintenance, MaintenanceStatus


async def seed_finance():
    async with AsyncSessionLocal() as session:
        vehicles = (
            await session.execute(select(Vehicle).where(Vehicle.deleted_at.is_(None)))
        ).scalars().all()
        trips = (await session.execute(select(Trip))).scalars().all()
        by_plate = {v.license_plate: v for v in vehicles}

        van = by_plate.get("GJ01AB452")
        truck = by_plate.get("GJ01AB998")
        mini = by_plate.get("GJ01AB1120")

        if not van:
            print("Missing vehicles. Run seed_vehicles first.")
            return

        today = date.today()
        created_fuel = 0
        created_exp = 0

        async def ensure_fuel(**kwargs):
            nonlocal created_fuel
            existing = await session.execute(
                select(FuelLog).where(
                    FuelLog.vehicle_id == kwargs["vehicle_id"],
                    FuelLog.date_filled == kwargs["date_filled"],
                    FuelLog.cost == kwargs["cost"],
                )
            )
            if existing.scalar_one_or_none():
                print(f"skip fuel {kwargs['date_filled']} cost={kwargs['cost']}")
                return
            session.add(FuelLog(**kwargs))
            created_fuel += 1

        async def ensure_expense(**kwargs):
            nonlocal created_exp
            existing = await session.execute(
                select(Expense).where(
                    Expense.trip_id == kwargs.get("trip_id"),
                    Expense.expense_type == kwargs["expense_type"],
                    Expense.amount == kwargs["amount"],
                    Expense.date_incurred == kwargs["date_incurred"],
                )
            )
            if existing.scalar_one_or_none():
                print(
                    f"skip expense {kwargs['expense_type'].value} "
                    f"amount={kwargs['amount']}"
                )
                return
            session.add(Expense(**kwargs))
            created_exp += 1

        # Fuel logs (gallons column stores liters in API convention)
        await ensure_fuel(
            vehicle_id=van.id,
            gallons=42,
            cost=3150,
            date_filled=today - timedelta(days=7),
        )
        if truck:
            await ensure_fuel(
                vehicle_id=truck.id,
                gallons=110,
                cost=8400,
                date_filled=today - timedelta(days=5),
            )
        if mini:
            await ensure_fuel(
                vehicle_id=mini.id,
                gallons=28,
                cost=2050,
                date_filled=today - timedelta(days=2),
            )

        planned = next((t for t in trips if t.status == TripStatus.PLANNED), None)
        in_progress = next(
            (t for t in trips if t.status == TripStatus.IN_PROGRESS), None
        )
        completed = next(
            (t for t in trips if t.status == TripStatus.COMPLETED), None
        )

        # Trip expenses matching UI columns
        if planned:
            await ensure_expense(
                vehicle_id=planned.vehicle_id,
                trip_id=planned.id,
                expense_type=ExpenseType.TOLL,
                amount=450,
                date_incurred=today - timedelta(days=1),
                description="Expressway toll",
            )
            await ensure_expense(
                vehicle_id=planned.vehicle_id,
                trip_id=planned.id,
                expense_type=ExpenseType.OTHER,
                amount=200,
                date_incurred=today - timedelta(days=1),
                description="Parking",
            )

        if in_progress:
            await ensure_expense(
                vehicle_id=in_progress.vehicle_id,
                trip_id=in_progress.id,
                expense_type=ExpenseType.TOLL,
                amount=780,
                date_incurred=today,
                description="Highway toll",
            )
            await ensure_expense(
                vehicle_id=in_progress.vehicle_id,
                trip_id=in_progress.id,
                expense_type=ExpenseType.OTHER,
                amount=350,
                date_incurred=today,
                description="Driver meal allowance",
            )

        if completed:
            await ensure_expense(
                vehicle_id=completed.vehicle_id,
                trip_id=completed.id,
                expense_type=ExpenseType.TOLL,
                amount=620,
                date_incurred=today - timedelta(days=10),
                description="Return toll",
            )
            # Linked maintenance cost on the completed trip
            maint = (
                await session.execute(
                    select(Maintenance).where(
                        Maintenance.vehicle_id == completed.vehicle_id,
                        Maintenance.status == MaintenanceStatus.COMPLETED,
                    )
                )
            ).scalars().first()
            linked_cost = float(maint.cost) if maint and maint.cost else 18000
            await ensure_expense(
                vehicle_id=completed.vehicle_id,
                trip_id=completed.id,
                expense_type=ExpenseType.MAINTENANCE,
                amount=linked_cost,
                date_incurred=today - timedelta(days=12),
                description="Linked maintenance charge",
            )

        await session.commit()
        print(f"Seeded {created_fuel} fuel logs and {created_exp} expenses.")


if __name__ == "__main__":
    asyncio.run(seed_finance())
