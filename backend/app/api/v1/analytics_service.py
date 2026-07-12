"""Role-aware analytics aggregations — answers 'why is this happening?'."""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.dashboard_service import _driver_base, _resolve_view, _role_name, _vehicle_base
from app.api.v1.schemas import (
    AnalyticsOverview,
    DriverAnalyticsData,
    DriverAnalyticsTrip,
    FinanceAnalyticsData,
    FleetAnalyticsData,
    NamedCount,
    SafetyAnalyticsData,
    TrendPoint,
)
from app.modules.drivers.models import Driver, DriverStatus
from app.modules.finance.models import Expense, FuelLog
from app.modules.fleet.models import Vehicle, VehicleStatus
from app.modules.maintenance.models import Maintenance, MaintenanceStatus
from app.modules.trips.models import Trip, TripStatus
from app.modules.users.models import User


def _parse_date(value: str | None, default: date) -> date:
    if not value:
        return default
    try:
        return date.fromisoformat(value[:10])
    except ValueError:
        return default


def _month_range(start: date, end: date) -> list[tuple[date, date, str]]:
    """Inclusive month buckets covering [start, end]."""
    months: list[tuple[date, date, str]] = []
    cur = start.replace(day=1)
    last = end.replace(day=1)
    while cur <= last:
        nxt = (cur + timedelta(days=32)).replace(day=1)
        months.append((cur, nxt, cur.strftime("%b %Y")))
        cur = nxt
    return months


async def build_analytics_overview(
    db: AsyncSession,
    user: User,
    *,
    vehicle_id: str | None = None,
    vehicle_type: str | None = None,
    region: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> AnalyticsOverview:
    role = await _role_name(db, user)
    view = _resolve_view(role, user.is_superuser)
    today = date.today()
    start = _parse_date(date_from, today - timedelta(days=180))
    end = _parse_date(date_to, today)

    overview = AnalyticsOverview(role=role or "Unknown", view=view)
    if view == "fleet":
        overview.fleet = await _fleet_analytics(
            db,
            vehicle_id=vehicle_id,
            vehicle_type=vehicle_type,
            region=region,
            start=start,
            end=end,
        )
    elif view == "driver":
        overview.driver = await _driver_analytics(db, user, start=start, end=end)
    elif view == "safety":
        overview.safety = await _safety_analytics(db, start=start, end=end)
    elif view == "finance":
        overview.finance = await _finance_analytics(db, start=start, end=end)
    return overview


async def _fleet_analytics(
    db: AsyncSession,
    *,
    vehicle_id: str | None,
    vehicle_type: str | None,
    region: str | None,
    start: date,
    end: date,
) -> FleetAnalyticsData:
    vehicles = (await db.execute(_vehicle_base())).scalars().all()
    if vehicle_type and vehicle_type != "ALL":
        vehicles = [v for v in vehicles if v.vehicle_type == vehicle_type]
    if vehicle_id and vehicle_id != "ALL":
        try:
            vid = UUID(vehicle_id)
            vehicles = [v for v in vehicles if v.id == vid]
        except ValueError:
            vehicles = []

    vehicle_ids = {v.id for v in vehicles}
    trips = (await db.execute(select(Trip))).scalars().all()
    if region and region != "ALL":
        trips = [t for t in trips if t.origin == region]
    trips = [
        t
        for t in trips
        if t.vehicle_id in vehicle_ids
        and t.start_time
        and start <= t.start_time.astimezone(timezone.utc).date() <= end
    ]

    fuel_logs = (await db.execute(select(FuelLog))).scalars().all()
    fuel_logs = [
        f
        for f in fuel_logs
        if f.vehicle_id in vehicle_ids and start <= f.date_filled <= end
    ]
    maint_rows = (await db.execute(select(Maintenance))).scalars().all()
    maint_rows = [
        m
        for m in maint_rows
        if m.vehicle_id in vehicle_ids
        and m.scheduled_date
        and start <= m.scheduled_date <= end
    ]

    # Utilization trend — weekly buckets
    util_trend: list[TrendPoint] = []
    active_fleet = max(
        sum(
            1
            for v in vehicles
            if v.status != VehicleStatus.INACTIVE
        ),
        1,
    )
    cursor = start
    while cursor <= end:
        week_end = min(cursor + timedelta(days=6), end)
        used = {
            t.vehicle_id
            for t in trips
            if t.start_time
            and cursor
            <= t.start_time.astimezone(timezone.utc).date()
            <= week_end
            and t.status != TripStatus.CANCELLED
        }
        util_trend.append(
            TrendPoint(
                label=cursor.strftime("%d %b"),
                value=round(min(100.0, len(used) / active_fleet * 100), 1),
            )
        )
        cursor = week_end + timedelta(days=1)

    # Vehicle usage — trip counts
    usage_counts: dict[UUID, int] = defaultdict(int)
    for t in trips:
        if t.status != TripStatus.CANCELLED:
            usage_counts[t.vehicle_id] += 1
    by_id = {v.id: v for v in vehicles}
    vehicle_usage = [
        NamedCount(name=by_id[vid].model or by_id[vid].license_plate, value=float(cnt))
        for vid, cnt in sorted(usage_counts.items(), key=lambda x: -x[1])[:10]
        if vid in by_id
    ]

    # Maintenance frequency
    maint_freq: dict[UUID, int] = defaultdict(int)
    for m in maint_rows:
        maint_freq[m.vehicle_id] += 1
    maintenance_frequency = [
        NamedCount(name=by_id[vid].model or by_id[vid].license_plate, value=float(cnt))
        for vid, cnt in sorted(maint_freq.items(), key=lambda x: -x[1])[:10]
        if vid in by_id
    ]

    # Downtime — open/completed shop jobs as downtime units
    downtime: dict[UUID, int] = defaultdict(int)
    for m in maint_rows:
        if m.status in (
            MaintenanceStatus.IN_PROGRESS,
            MaintenanceStatus.SCHEDULED,
            MaintenanceStatus.COMPLETED,
        ):
            downtime[m.vehicle_id] += 1
    downtime_analysis = [
        NamedCount(name=by_id[vid].model or by_id[vid].license_plate, value=float(cnt))
        for vid, cnt in sorted(downtime.items(), key=lambda x: -x[1])[:10]
        if vid in by_id
    ]

    # Availability by type
    type_totals: dict[str, int] = defaultdict(int)
    type_available: dict[str, int] = defaultdict(int)
    for v in vehicles:
        type_totals[v.vehicle_type or "Other"] += 1
        if v.status == VehicleStatus.ACTIVE:
            type_available[v.vehicle_type or "Other"] += 1
    vehicle_availability = [
        NamedCount(
            name=t,
            value=round((type_available[t] / type_totals[t]) * 100, 1)
            if type_totals[t]
            else 0,
        )
        for t in sorted(type_totals.keys())
    ]

    # Cost per KM
    dist_by_v: dict[UUID, float] = defaultdict(float)
    for t in trips:
        if t.status == TripStatus.COMPLETED and t.planned_distance_km:
            dist_by_v[t.vehicle_id] += float(t.planned_distance_km)
    cost_by_v: dict[UUID, float] = defaultdict(float)
    for f in fuel_logs:
        cost_by_v[f.vehicle_id] += float(f.cost)
    for m in maint_rows:
        cost_by_v[m.vehicle_id] += float(m.cost or 0)
    cost_per_km = []
    for vid, cost in cost_by_v.items():
        if vid not in by_id:
            continue
        dist = dist_by_v.get(vid) or 0
        value = round(cost / dist, 2) if dist > 0 else round(cost, 2)
        cost_per_km.append(
            NamedCount(name=by_id[vid].model or by_id[vid].license_plate, value=value)
        )
    cost_per_km.sort(key=lambda x: -x.value)
    cost_per_km = cost_per_km[:10]

    all_vehicles = (await db.execute(_vehicle_base())).scalars().all()
    regions = sorted(
        {
            o
            for o in (await db.execute(select(Trip.origin).distinct())).scalars().all()
            if o
        }
    )
    types = sorted({v.vehicle_type for v in all_vehicles if v.vehicle_type})

    return FleetAnalyticsData(
        utilization_trend=util_trend,
        vehicle_usage=vehicle_usage,
        maintenance_frequency=maintenance_frequency,
        downtime_analysis=downtime_analysis,
        vehicle_availability=vehicle_availability,
        cost_per_km=cost_per_km,
        filter_options={
            "vehicles": ["ALL"]
            + [f"{v.id}|{v.model} · {v.license_plate}" for v in all_vehicles],
            "vehicle_types": ["ALL", *types],
            "regions": ["ALL", *regions],
        },
    )


async def _driver_analytics(
    db: AsyncSession, user: User, *, start: date, end: date
) -> DriverAnalyticsData:
    driver = (
        await db.execute(select(Driver).where(Driver.user_id == user.id))
    ).scalar_one_or_none()
    if not driver:
        return DriverAnalyticsData(linked=False)

    trips = (
        await db.execute(
            select(Trip)
            .where(Trip.driver_id == driver.id)
            .order_by(Trip.start_time.desc())
        )
    ).scalars().all()
    trips = [
        t
        for t in trips
        if t.start_time
        and start <= t.start_time.astimezone(timezone.utc).date() <= end
    ]

    completed = [t for t in trips if t.status == TripStatus.COMPLETED]
    distance = sum(float(t.planned_distance_km or 0) for t in completed)
    vehicle_ids = {t.vehicle_id for t in trips}

    fuel_logs = []
    if vehicle_ids:
        fuel_logs = (
            await db.execute(
                select(FuelLog).where(
                    FuelLog.vehicle_id.in_(list(vehicle_ids)),
                    FuelLog.date_filled >= start,
                    FuelLog.date_filled <= end,
                )
            )
        ).scalars().all()
    fuel_cost = sum(float(f.cost) for f in fuel_logs)
    fuel_liters = sum(float(f.gallons) for f in fuel_logs)
    efficiency = round(distance / fuel_liters, 2) if fuel_liters > 0 else 0.0

    my_trips = [
        DriverAnalyticsTrip(
            trip_id=t.id,
            label=f"{t.origin} → {t.destination}",
            status=t.status.value if hasattr(t.status, "value") else str(t.status),
            distance_km=t.planned_distance_km,
            start_time=t.start_time,
        )
        for t in trips[:20]
    ]

    return DriverAnalyticsData(
        linked=True,
        driver_name=f"{driver.first_name} {driver.last_name}".strip() or None,
        trips_completed=len(completed),
        distance_travelled_km=round(distance, 1),
        fuel_consumption_cost=round(fuel_cost, 2),
        fuel_liters=round(fuel_liters, 1),
        average_fuel_efficiency=efficiency,
        my_trips=my_trips,
    )


async def _safety_analytics(
    db: AsyncSession, *, start: date, end: date
) -> SafetyAnalyticsData:
    drivers = (await db.execute(_driver_base())).scalars().all()
    months = _month_range(start.replace(day=1), end)

    # License expiry trend — count expiring in each month
    license_trend = []
    for m_start, m_end, label in months:
        count = sum(
            1
            for d in drivers
            if d.license_expiry and m_start <= d.license_expiry < m_end
        )
        license_trend.append(TrendPoint(label=label, value=float(count)))

    # Safety score trend — average score (static snapshot repeated with slight noise by month
    # using current scores; for demo we show fleet average as flat trend + suspended pressure)
    avg = (
        round(sum(d.safety_score for d in drivers) / len(drivers), 1) if drivers else 0.0
    )
    suspended = [d for d in drivers if d.status == DriverStatus.SUSPENDED]
    score_trend = [
        TrendPoint(
            label=label,
            value=round(max(0, avg - (len(suspended) * 0.3 * i / max(len(months), 1))), 1),
        )
        for i, (_, _, label) in enumerate(months)
    ]

    # Violations proxy: drivers with safety_score < 85
    violators = [d for d in drivers if d.safety_score < 85]
    violations = [
        NamedCount(
            name=f"{d.first_name} {d.last_name}".strip() or d.license_number,
            value=float(d.safety_score),
        )
        for d in sorted(violators, key=lambda x: x.safety_score)[:10]
    ]

    suspended_list = [
        NamedCount(
            name=f"{d.first_name} {d.last_name}".strip() or d.license_number,
            value=float(d.safety_score),
        )
        for d in suspended
    ]

    return SafetyAnalyticsData(
        license_expiry_trend=license_trend,
        safety_score_trend=score_trend,
        violations=violations,
        suspended_drivers=suspended_list,
        average_driver_rating=avg,
        suspended_count=len(suspended),
        violation_count=len(violators),
    )


async def _finance_analytics(
    db: AsyncSession, *, start: date, end: date
) -> FinanceAnalyticsData:
    fuel_rows = (await db.execute(select(FuelLog))).scalars().all()
    maint_rows = (await db.execute(select(Maintenance))).scalars().all()
    expense_rows = (await db.execute(select(Expense))).scalars().all()
    vehicles = (await db.execute(_vehicle_base())).scalars().all()
    trips = (await db.execute(select(Trip))).scalars().all()

    months = _month_range(start.replace(day=1), end)

    fuel_over_time: list[TrendPoint] = []
    maint_over_time: list[TrendPoint] = []
    ops_trend: list[TrendPoint] = []
    profitability: list[TrendPoint] = []

    for m_start, m_end, label in months:
        fuel_m = sum(
            float(f.cost)
            for f in fuel_rows
            if m_start <= f.date_filled < m_end
        )
        maint_m = sum(
            float(m.cost or 0)
            for m in maint_rows
            if m.scheduled_date and m_start <= m.scheduled_date < m_end
        )
        exp_m = sum(
            float(e.amount)
            for e in expense_rows
            if m_start <= e.date_incurred < m_end
        )
        ops = fuel_m + maint_m
        # Revenue proxy from completed trip distance in month
        revenue = sum(
            float(t.planned_distance_km or 0) * 12
            for t in trips
            if t.status == TripStatus.COMPLETED
            and t.start_time
            and m_start <= t.start_time.astimezone(timezone.utc).date() < m_end
        )
        fuel_over_time.append(TrendPoint(label=label, value=round(fuel_m, 0)))
        maint_over_time.append(TrendPoint(label=label, value=round(maint_m, 0)))
        ops_trend.append(TrendPoint(label=label, value=round(ops, 0)))
        profitability.append(
            TrendPoint(label=label, value=round(revenue - ops - exp_m, 0))
        )

    # Expense breakdown (in range)
    breakdown_map: dict[str, float] = defaultdict(float)
    for e in expense_rows:
        if start <= e.date_incurred <= end:
            et = e.expense_type.value if hasattr(e.expense_type, "value") else str(e.expense_type)
            breakdown_map[et] += float(e.amount)
    # Include fuel logs + maintenance as top-level cost categories
    fuel_total = sum(
        float(f.cost) for f in fuel_rows if start <= f.date_filled <= end
    )
    maint_total = sum(
        float(m.cost or 0)
        for m in maint_rows
        if m.scheduled_date and start <= m.scheduled_date <= end
    )
    expense_breakdown = [
        NamedCount(name="Fuel", value=round(fuel_total, 0)),
        NamedCount(name="Maintenance", value=round(maint_total, 0)),
        *[
            NamedCount(name=k.title(), value=round(v, 0))
            for k, v in breakdown_map.items()
            if k not in ("FUEL", "MAINTENANCE")
        ],
    ]

    # ROI + top costly + fuel efficiency per vehicle
    roi_items: list[NamedCount] = []
    costly: list[NamedCount] = []
    efficiency: list[NamedCount] = []
    for v in vehicles:
        if v.status == VehicleStatus.INACTIVE:
            continue
        v_fuel = sum(
            float(f.cost)
            for f in fuel_rows
            if f.vehicle_id == v.id and start <= f.date_filled <= end
        )
        v_liters = sum(
            float(f.gallons)
            for f in fuel_rows
            if f.vehicle_id == v.id and start <= f.date_filled <= end
        )
        v_maint = sum(
            float(m.cost or 0)
            for m in maint_rows
            if m.vehicle_id == v.id
            and m.scheduled_date
            and start <= m.scheduled_date <= end
        )
        v_exp = sum(
            float(e.amount)
            for e in expense_rows
            if e.vehicle_id == v.id and start <= e.date_incurred <= end
        )
        completed = [
            t
            for t in trips
            if t.vehicle_id == v.id
            and t.status == TripStatus.COMPLETED
            and t.start_time
            and start <= t.start_time.astimezone(timezone.utc).date() <= end
        ]
        dist = sum(float(t.planned_distance_km or 0) for t in completed)
        revenue = dist * 12
        cost = v_fuel + v_maint + v_exp
        acq = float(v.acquisition_cost or 0)
        roi = ((revenue - cost) / acq) * 100 if acq > 0 else (revenue - cost)
        label = v.model or v.license_plate
        roi_items.append(NamedCount(name=label, value=round(roi, 1)))
        costly.append(NamedCount(name=label, value=round(cost, 0)))
        eff = round(dist / v_liters, 2) if v_liters > 0 else 0.0
        efficiency.append(NamedCount(name=label, value=eff))

    roi_items.sort(key=lambda x: -x.value)
    costly.sort(key=lambda x: -x.value)
    efficiency.sort(key=lambda x: -x.value)

    return FinanceAnalyticsData(
        fuel_cost_over_time=fuel_over_time,
        maintenance_cost=maint_over_time,
        expense_breakdown=expense_breakdown,
        operational_cost_trend=ops_trend,
        roi_per_vehicle=roi_items[:10],
        top_costly_vehicles=costly[:8],
        fuel_efficiency_comparison=efficiency[:10],
        monthly_profitability=profitability,
    )
