"""Role-aware dashboard aggregations."""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.schemas import (
    DashboardOverview,
    DriverActiveTrip,
    DriverDashboardData,
    DriverTodayTrip,
    FinanceDashboardData,
    FinanceDashboardKpis,
    FleetDashboardCharts,
    FleetDashboardData,
    FleetDashboardKpis,
    NamedCount,
    SafetyDashboardData,
    SafetyDashboardKpis,
    TrendPoint,
)
from app.modules.drivers.models import Driver, DriverStatus
from app.modules.finance.models import Expense, FuelLog
from app.modules.fleet.models import Vehicle, VehicleStatus
from app.modules.maintenance.models import Maintenance, MaintenanceStatus
from app.modules.roles.models import Role
from app.modules.trips.models import Trip, TripStatus
from app.modules.users.models import User


def _vehicle_base() -> Select:
    return select(Vehicle).where(Vehicle.deleted_at.is_(None))


def _driver_base() -> Select:
    return select(Driver).where(Driver.deleted_at.is_(None))


def _resolve_view(role_name: str | None, is_superuser: bool) -> str:
    if is_superuser or role_name in (None, "Admin", "Fleet Manager"):
        return "fleet"
    if role_name == "Driver":
        return "driver"
    if role_name == "Safety Officer":
        return "safety"
    if role_name == "Financial Analyst":
        return "finance"
    return "fleet"


async def _role_name(db: AsyncSession, user: User) -> str | None:
    if user.is_superuser:
        return "Admin"
    if not user.role_id:
        return None
    role = await db.get(Role, user.role_id)
    return role.name if role else None


async def build_dashboard_overview(
    db: AsyncSession,
    user: User,
    *,
    vehicle_type: str | None = None,
    status: str | None = None,
    region: str | None = None,
) -> DashboardOverview:
    role = await _role_name(db, user)
    view = _resolve_view(role, user.is_superuser)

    overview = DashboardOverview(role=role or "Unknown", view=view)

    if view == "fleet":
        overview.fleet = await _fleet_dashboard(
            db, vehicle_type=vehicle_type, status=status, region=region
        )
    elif view == "driver":
        overview.driver = await _driver_dashboard(db, user)
    elif view == "safety":
        overview.safety = await _safety_dashboard(db)
    elif view == "finance":
        overview.finance = await _finance_dashboard(db)

    return overview


async def _filtered_vehicle_ids(
    db: AsyncSession,
    *,
    vehicle_type: str | None,
    status: str | None,
    region: str | None,
) -> set[UUID] | None:
    """None means no filter (all vehicles). Empty set means no matches."""
    q = select(Vehicle.id).where(Vehicle.deleted_at.is_(None))
    if vehicle_type and vehicle_type != "ALL":
        q = q.where(Vehicle.vehicle_type == vehicle_type)
    if status and status != "ALL":
        q = q.where(Vehicle.status == status)
    if region and region != "ALL":
        trip_vehicles = (
            await db.execute(
                select(Trip.vehicle_id).where(Trip.origin == region).distinct()
            )
        ).scalars().all()
        if not trip_vehicles:
            return set()
        q = q.where(Vehicle.id.in_(list(trip_vehicles)))

    if not vehicle_type and not status and not region:
        return None
    if (not vehicle_type or vehicle_type == "ALL") and (
        not status or status == "ALL"
    ) and (not region or region == "ALL"):
        return None

    ids = (await db.execute(q)).scalars().all()
    return set(ids)


async def _fleet_dashboard(
    db: AsyncSession,
    *,
    vehicle_type: str | None,
    status: str | None,
    region: str | None,
) -> FleetDashboardData:
    filtered_ids = await _filtered_vehicle_ids(
        db, vehicle_type=vehicle_type, status=status, region=region
    )

    vehicles = (await db.execute(_vehicle_base())).scalars().all()
    if filtered_ids is not None:
        vehicles = [v for v in vehicles if v.id in filtered_ids]

    def count_status(*statuses: VehicleStatus) -> int:
        return sum(1 for v in vehicles if v.status in statuses)

    available = count_status(VehicleStatus.ACTIVE)
    on_trip = count_status(VehicleStatus.ON_TRIP)
    in_shop = count_status(VehicleStatus.MAINTENANCE)
    retired = count_status(VehicleStatus.INACTIVE)
    active_fleet = available + on_trip + in_shop
    utilization = round((on_trip / active_fleet) * 100, 1) if active_fleet else 0.0

    drivers = (await db.execute(_driver_base())).scalars().all()
    on_duty = sum(
        1
        for d in drivers
        if d.status in (DriverStatus.AVAILABLE, DriverStatus.ON_TRIP, DriverStatus.ACTIVE)
    )

    trips_q = select(Trip)
    if filtered_ids is not None:
        if filtered_ids:
            trips_q = trips_q.where(Trip.vehicle_id.in_(list(filtered_ids)))
        else:
            trips_q = trips_q.where(False)
    trips = (await db.execute(trips_q)).scalars().all()
    active_trips = sum(1 for t in trips if t.status == TripStatus.IN_PROGRESS)
    pending_trips = sum(1 for t in trips if t.status == TripStatus.PLANNED)

    status_chart = [
        NamedCount(name="Available", value=available),
        NamedCount(name="On Trip", value=on_trip),
        NamedCount(name="In Shop", value=in_shop),
        NamedCount(name="Retired", value=retired),
    ]

    region_counts: dict[str, int] = defaultdict(int)
    for t in trips:
        if t.status in (TripStatus.PLANNED, TripStatus.IN_PROGRESS, TripStatus.COMPLETED):
            region_counts[t.origin or "Unknown"] += 1
    trips_by_region = [
        NamedCount(name=k, value=v)
        for k, v in sorted(region_counts.items(), key=lambda x: -x[1])[:8]
    ]

    # Utilization trend: last 7 days based on vehicles with trips starting that day
    today = datetime.now(timezone.utc).date()
    util_trend: list[TrendPoint] = []
    denom = max(active_fleet, 1)
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_vehicle_ids = {
            t.vehicle_id
            for t in trips
            if t.start_time
            and t.start_time.astimezone(timezone.utc).date() == day
            and t.status != TripStatus.CANCELLED
        }
        util_trend.append(
            TrendPoint(
                label=day.strftime("%d %b"),
                value=round(min(100.0, (len(day_vehicle_ids) / denom) * 100), 1),
            )
        )

    # Vehicles near maintenance: open jobs + scheduled within 14 days
    near_cutoff = today + timedelta(days=14)
    maint = (
        await db.execute(
            select(Maintenance).where(
                Maintenance.status.in_(
                    [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]
                )
            )
        )
    ).scalars().all()
    vehicle_by_id = {v.id: v for v in vehicles}
    near_items: list[NamedCount] = []
    for m in maint:
        if filtered_ids is not None and m.vehicle_id not in filtered_ids:
            continue
        if m.status == MaintenanceStatus.SCHEDULED and m.scheduled_date > near_cutoff:
            continue
        v = vehicle_by_id.get(m.vehicle_id)
        label = (v.model if v else "Vehicle") + f" · {m.maintenance_type}"
        near_items.append(NamedCount(name=label, value=float(m.cost or 0)))
    near_items = near_items[:8]

    types = sorted({v.vehicle_type for v in (await db.execute(_vehicle_base())).scalars().all() if v.vehicle_type})
    regions = sorted(
        {
            origin
            for origin in (await db.execute(select(Trip.origin).distinct())).scalars().all()
            if origin
        }
    )

    return FleetDashboardData(
        kpis=FleetDashboardKpis(
            active_vehicles=available + on_trip,
            available_vehicles=available,
            vehicles_in_shop=in_shop,
            retired_vehicles=retired,
            drivers_on_duty=on_duty,
            active_trips=active_trips,
            pending_trips=pending_trips,
            fleet_utilization_pct=utilization,
        ),
        charts=FleetDashboardCharts(
            vehicle_status=status_chart,
            trips_by_region=trips_by_region,
            utilization_trend=util_trend,
            vehicles_near_maintenance=near_items,
        ),
        filter_options={
            "vehicle_types": ["ALL", *types],
            "statuses": ["ALL", "ACTIVE", "ON_TRIP", "MAINTENANCE", "INACTIVE"],
            "regions": ["ALL", *regions],
        },
    )


async def _driver_dashboard(db: AsyncSession, user: User) -> DriverDashboardData:
    driver = (
        await db.execute(select(Driver).where(Driver.user_id == user.id))
    ).scalar_one_or_none()
    if not driver:
        return DriverDashboardData(linked=False)

    name = f"{driver.first_name} {driver.last_name}".strip()
    trips = (
        await db.execute(
            select(Trip)
            .where(Trip.driver_id == driver.id)
            .order_by(Trip.start_time.desc())
        )
    ).scalars().all()

    active = next((t for t in trips if t.status == TripStatus.IN_PROGRESS), None)
    active_payload: DriverActiveTrip | None = None
    if active:
        vehicle = await db.get(Vehicle, active.vehicle_id)
        fuel_q = select(func.coalesce(func.sum(FuelLog.cost), 0)).where(
            FuelLog.vehicle_id == active.vehicle_id
        )
        if active.start_time:
            fuel_q = fuel_q.where(
                FuelLog.date_filled >= active.start_time.astimezone(timezone.utc).date()
            )
        fuel_cost = float((await db.execute(fuel_q)).scalar() or 0)
        active_payload = DriverActiveTrip(
            trip_id=active.id,
            trip_label=f"{active.origin} → {active.destination}",
            status=active.status.value if hasattr(active.status, "value") else str(active.status),
            vehicle_reg=vehicle.license_plate if vehicle else None,
            vehicle_model=vehicle.model if vehicle else None,
            distance_remaining_km=active.planned_distance_km,
            fuel_consumed_cost=fuel_cost,
            origin=active.origin,
            destination=active.destination,
        )

    today = datetime.now(timezone.utc).date()
    today_trips: list[DriverTodayTrip] = []
    for t in trips:
        if not t.start_time:
            continue
        if t.start_time.astimezone(timezone.utc).date() != today:
            continue
        vehicle = await db.get(Vehicle, t.vehicle_id)
        today_trips.append(
            DriverTodayTrip(
                trip_id=t.id,
                label=f"{t.origin} → {t.destination}",
                status=t.status.value if hasattr(t.status, "value") else str(t.status),
                start_time=t.start_time,
                vehicle_reg=vehicle.license_plate if vehicle else None,
            )
        )

    fuel_today = float(
        (
            await db.execute(
                select(func.coalesce(func.sum(FuelLog.cost), 0)).select_from(FuelLog).where(
                    FuelLog.date_filled == today
                )
            )
        ).scalar()
        or 0
    )
    # Prefer vehicle-scoped fuel if we know assigned vehicles today
    vehicle_ids = {t.vehicle_id for t in trips if t.start_time and t.start_time.astimezone(timezone.utc).date() == today}
    if vehicle_ids:
        fuel_today = float(
            (
                await db.execute(
                    select(func.coalesce(func.sum(FuelLog.cost), 0)).where(
                        FuelLog.vehicle_id.in_(list(vehicle_ids)),
                        FuelLog.date_filled == today,
                    )
                )
            ).scalar()
            or 0
        )

    expense_today = 0.0
    trip_ids = [t.id for t in trips]
    if trip_ids:
        expense_today = float(
            (
                await db.execute(
                    select(func.coalesce(func.sum(Expense.amount), 0)).where(
                        Expense.trip_id.in_(trip_ids),
                        Expense.date_incurred == today,
                    )
                )
            ).scalar()
            or 0
        )

    return DriverDashboardData(
        driver_name=name or None,
        linked=True,
        active_trip=active_payload,
        today_trips=today_trips,
        fuel_consumed_today=fuel_today,
        expense_today=expense_today,
    )


async def _safety_dashboard(db: AsyncSession) -> SafetyDashboardData:
    drivers = (await db.execute(_driver_base())).scalars().all()
    today = date.today()
    soon = today + timedelta(days=30)

    expired = sum(
        1 for d in drivers if d.license_expiry and d.license_expiry < today
    )
    expiring = sum(
        1
        for d in drivers
        if d.license_expiry and today <= d.license_expiry <= soon
    )
    suspended = sum(1 for d in drivers if d.status == DriverStatus.SUSPENDED)
    on_trip = sum(1 for d in drivers if d.status == DriverStatus.ON_TRIP)
    avg_score = (
        round(sum(d.safety_score for d in drivers) / len(drivers), 1) if drivers else 0.0
    )

    # License expiry timeline — next 6 months buckets
    timeline: list[TrendPoint] = []
    for i in range(6):
        month_start = (today.replace(day=1) + timedelta(days=32 * i)).replace(day=1)
        if i < 5:
            next_month = (month_start + timedelta(days=32)).replace(day=1)
        else:
            next_month = month_start + timedelta(days=365)
        count = sum(
            1
            for d in drivers
            if d.license_expiry and month_start <= d.license_expiry < next_month
        )
        timeline.append(
            TrendPoint(label=month_start.strftime("%b %Y"), value=float(count))
        )

    buckets = [("0-70", 0, 70), ("70-80", 70, 80), ("80-90", 80, 90), ("90-100", 90, 101)]
    distribution = []
    for label, lo, hi in buckets:
        distribution.append(
            NamedCount(
                name=label,
                value=float(sum(1 for d in drivers if lo <= d.safety_score < hi)),
            )
        )

    return SafetyDashboardData(
        kpis=SafetyDashboardKpis(
            expired_licenses=expired,
            expiring_soon=expiring,
            suspended_drivers=suspended,
            drivers_on_trip=on_trip,
            average_safety_score=avg_score,
        ),
        license_expiry_timeline=timeline,
        safety_score_distribution=distribution,
    )


async def _month_starts(n: int = 6) -> list[date]:
    today = date.today().replace(day=1)
    months = [today]
    cur = today
    for _ in range(n - 1):
        cur = (cur - timedelta(days=1)).replace(day=1)
        months.append(cur)
    return list(reversed(months))


async def _finance_dashboard(db: AsyncSession) -> FinanceDashboardData:
    total_fuel = float(
        (await db.execute(select(func.coalesce(func.sum(FuelLog.cost), 0)))).scalar() or 0
    )
    total_maint = float(
        (
            await db.execute(select(func.coalesce(func.sum(Maintenance.cost), 0)))
        ).scalar()
        or 0
    )
    total_expenses = float(
        (await db.execute(select(func.coalesce(func.sum(Expense.amount), 0)))).scalar()
        or 0
    )
    ops = total_fuel + total_maint
    vehicles = (await db.execute(_vehicle_base())).scalars().all()
    vehicle_count = len([v for v in vehicles if v.status != VehicleStatus.INACTIVE]) or 1
    avg_cost = round(ops / vehicle_count, 2)

    # Monthly expenses (fuel + maint + expenses) last 6 months
    months = await _month_starts(6)
    monthly_points: list[TrendPoint] = []
    fuel_trend: list[TrendPoint] = []
    maint_trend: list[TrendPoint] = []
    current_month_total = 0.0

    fuel_rows = (await db.execute(select(FuelLog))).scalars().all()
    maint_rows = (await db.execute(select(Maintenance))).scalars().all()
    expense_rows = (await db.execute(select(Expense))).scalars().all()

    for i, start in enumerate(months):
        if i + 1 < len(months):
            end = months[i + 1]
        else:
            end = date.today() + timedelta(days=1)

        fuel_m = sum(f.cost for f in fuel_rows if start <= f.date_filled < end)
        maint_m = sum(
            (m.cost or 0)
            for m in maint_rows
            if m.scheduled_date and start <= m.scheduled_date < end
        )
        exp_m = sum(e.amount for e in expense_rows if start <= e.date_incurred < end)
        total_m = float(fuel_m + maint_m + exp_m)
        label = start.strftime("%b %Y")
        monthly_points.append(TrendPoint(label=label, value=round(total_m, 0)))
        fuel_trend.append(TrendPoint(label=label, value=round(float(fuel_m), 0)))
        maint_trend.append(TrendPoint(label=label, value=round(float(maint_m), 0)))
        if start.month == date.today().month and start.year == date.today().year:
            current_month_total = total_m

    # ROI by vehicle
    trips = (await db.execute(select(Trip))).scalars().all()
    roi_items: list[NamedCount] = []
    for v in vehicles:
        if v.status == VehicleStatus.INACTIVE:
            continue
        acq = float(v.acquisition_cost or 0)
        v_fuel = sum(f.cost for f in fuel_rows if f.vehicle_id == v.id)
        v_maint = sum((m.cost or 0) for m in maint_rows if m.vehicle_id == v.id)
        completed = [
            t
            for t in trips
            if t.vehicle_id == v.id and t.status == TripStatus.COMPLETED
        ]
        revenue = sum((t.planned_distance_km or 0) * 12 for t in completed)
        cost = float(v_fuel + v_maint)
        if acq > 0:
            roi = ((revenue - cost) / acq) * 100
        else:
            roi = revenue - cost
        roi_items.append(
            NamedCount(name=v.model or v.license_plate, value=round(roi, 1))
        )
    roi_items.sort(key=lambda x: -x.value)
    fleet_roi = (
        round(sum(i.value for i in roi_items) / len(roi_items), 1) if roi_items else 0.0
    )

    return FinanceDashboardData(
        kpis=FinanceDashboardKpis(
            total_fuel_cost=round(total_fuel, 2),
            total_maintenance_cost=round(total_maint, 2),
            operational_cost=round(ops, 2),
            average_cost_per_vehicle=avg_cost,
            fleet_roi_pct=fleet_roi,
            monthly_expenses=round(current_month_total or (monthly_points[-1].value if monthly_points else 0), 2),
        ),
        fuel_cost_trend=fuel_trend,
        maintenance_cost_trend=maint_trend,
        roi_by_vehicle=roi_items[:8],
        cost_breakdown=[
            NamedCount(name="Fuel", value=round(total_fuel, 0)),
            NamedCount(name="Maintenance", value=round(total_maint, 0)),
            NamedCount(name="Tolls / Other", value=round(total_expenses, 0)),
        ],
    )
