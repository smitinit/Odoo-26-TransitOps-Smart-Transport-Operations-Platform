from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime, date
from typing import Optional

# ============================================================
# FLEET / VEHICLES
# ============================================================
class VehicleCreate(BaseModel):
    vin: str
    license_plate: str
    make: str
    model: str
    year: int
    vehicle_type: str = "Van"
    capacity: str = ""
    odometer: int = 0
    acquisition_cost: float = 0
    status: str = "ACTIVE"

class VehicleUpdate(BaseModel):
    vin: Optional[str] = None
    license_plate: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    vehicle_type: Optional[str] = None
    capacity: Optional[str] = None
    odometer: Optional[int] = None
    acquisition_cost: Optional[float] = None
    status: Optional[str] = None

class VehicleResponse(BaseModel):
    id: UUID
    vin: str
    license_plate: str
    make: str
    model: str
    year: int
    vehicle_type: str
    capacity: str
    odometer: int
    acquisition_cost: float
    status: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ============================================================
# DRIVERS
# ============================================================
class DriverCreate(BaseModel):
    first_name: str
    last_name: str
    license_number: str
    license_category: str = "LMV"
    license_expiry: Optional[date] = None
    contact_number: str = ""
    safety_score: int = 100
    trip_completion_pct: Optional[float] = None
    user_id: Optional[UUID] = None
    status: str = "AVAILABLE"

class DriverUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    license_number: Optional[str] = None
    license_category: Optional[str] = None
    license_expiry: Optional[date] = None
    contact_number: Optional[str] = None
    safety_score: Optional[int] = None
    trip_completion_pct: Optional[float] = None
    user_id: Optional[UUID] = None
    status: Optional[str] = None

class DriverResponse(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    first_name: str
    last_name: str
    license_number: str
    license_category: str
    license_expiry: Optional[date] = None
    contact_number: str
    safety_score: int
    trip_completion_pct: Optional[float] = None
    status: str
    license_expired: bool = False
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ============================================================
# TRIPS
# ============================================================
class TripCreate(BaseModel):
    vehicle_id: UUID
    driver_id: UUID
    origin: str
    destination: str
    start_time: datetime
    end_time: Optional[datetime] = None
    load_type: str = ""
    cargo_weight_kg: float = 0
    planned_distance_km: Optional[float] = None
    status: str = "PLANNED"

class TripUpdate(BaseModel):
    vehicle_id: Optional[UUID] = None
    driver_id: Optional[UUID] = None
    origin: Optional[str] = None
    destination: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    load_type: Optional[str] = None
    cargo_weight_kg: Optional[float] = None
    planned_distance_km: Optional[float] = None
    status: Optional[str] = None

class TripResponse(BaseModel):
    id: UUID
    vehicle_id: UUID
    driver_id: UUID
    origin: str
    destination: str
    start_time: datetime
    end_time: Optional[datetime]
    load_type: str
    cargo_weight_kg: float
    planned_distance_km: Optional[float]
    status: str
    vehicle_reg: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_capacity: Optional[str] = None
    driver_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ============================================================
# MAINTENANCE
# ============================================================
class MaintenanceCreate(BaseModel):
    vehicle_id: UUID
    maintenance_type: str = "General"
    description: str
    scheduled_date: date
    cost: Optional[float] = None
    status: str = "SCHEDULED"

class MaintenanceUpdate(BaseModel):
    vehicle_id: Optional[UUID] = None
    maintenance_type: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[date] = None
    cost: Optional[float] = None
    status: Optional[str] = None

class MaintenanceResponse(BaseModel):
    id: UUID
    vehicle_id: UUID
    maintenance_type: str
    description: str
    scheduled_date: date
    cost: Optional[float]
    status: str
    vehicle_reg: Optional[str] = None
    vehicle_model: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ============================================================
# EXPENSES
# ============================================================
class ExpenseCreate(BaseModel):
    vehicle_id: Optional[UUID] = None
    trip_id: Optional[UUID] = None
    expense_type: str
    amount: float
    date_incurred: date
    description: Optional[str] = None

class ExpenseUpdate(BaseModel):
    expense_type: Optional[str] = None
    amount: Optional[float] = None
    date_incurred: Optional[date] = None
    description: Optional[str] = None
    vehicle_id: Optional[UUID] = None
    trip_id: Optional[UUID] = None

class ExpenseResponse(BaseModel):
    id: UUID
    vehicle_id: Optional[UUID]
    trip_id: Optional[UUID]
    expense_type: str
    amount: float
    date_incurred: date
    description: Optional[str]
    vehicle_reg: Optional[str] = None
    vehicle_model: Optional[str] = None
    trip_label: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ============================================================
# FUEL LOGS
# ============================================================
class FuelLogCreate(BaseModel):
    vehicle_id: UUID
    liters: float
    cost: float
    date_filled: date

class FuelLogUpdate(BaseModel):
    liters: Optional[float] = None
    cost: Optional[float] = None
    date_filled: Optional[date] = None

class FuelLogResponse(BaseModel):
    id: UUID
    vehicle_id: UUID
    liters: float
    cost: float
    date_filled: date
    vehicle_reg: Optional[str] = None
    vehicle_model: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class OpsCostSummary(BaseModel):
    total_fuel_cost: float
    total_maintenance_cost: float
    total_toll_cost: float
    total_other_cost: float
    total_operational_cost: float


# ============================================================
# ROLES (Read-only for frontend)
# ============================================================
class RoleResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ============================================================
# DASHBOARD (Aggregated stats)
# ============================================================
class DashboardStats(BaseModel):
    total_vehicles: int
    active_vehicles: int
    total_drivers: int
    active_drivers: int
    total_trips: int
    trips_in_progress: int
    pending_maintenance: int
    total_expenses: float


class NamedCount(BaseModel):
    name: str
    value: float


class TrendPoint(BaseModel):
    label: str
    value: float


class FleetDashboardKpis(BaseModel):
    active_vehicles: int
    available_vehicles: int
    vehicles_in_shop: int
    retired_vehicles: int
    drivers_on_duty: int
    active_trips: int
    pending_trips: int
    fleet_utilization_pct: float


class FleetDashboardCharts(BaseModel):
    vehicle_status: list[NamedCount]
    trips_by_region: list[NamedCount]
    utilization_trend: list[TrendPoint]
    vehicles_near_maintenance: list[NamedCount]


class FleetDashboardData(BaseModel):
    kpis: FleetDashboardKpis
    charts: FleetDashboardCharts
    filter_options: dict[str, list[str]]


class DriverActiveTrip(BaseModel):
    trip_id: Optional[UUID] = None
    trip_label: Optional[str] = None
    status: Optional[str] = None
    vehicle_reg: Optional[str] = None
    vehicle_model: Optional[str] = None
    distance_remaining_km: Optional[float] = None
    fuel_consumed_cost: float = 0
    origin: Optional[str] = None
    destination: Optional[str] = None


class DriverTodayTrip(BaseModel):
    trip_id: UUID
    label: str
    status: str
    start_time: datetime
    vehicle_reg: Optional[str] = None


class DriverDashboardData(BaseModel):
    driver_name: Optional[str] = None
    linked: bool = False
    active_trip: Optional[DriverActiveTrip] = None
    today_trips: list[DriverTodayTrip] = []
    fuel_consumed_today: float = 0
    expense_today: float = 0


class SafetyDashboardKpis(BaseModel):
    expired_licenses: int
    expiring_soon: int
    suspended_drivers: int
    drivers_on_trip: int
    average_safety_score: float


class SafetyDashboardData(BaseModel):
    kpis: SafetyDashboardKpis
    license_expiry_timeline: list[TrendPoint]
    safety_score_distribution: list[NamedCount]


class FinanceDashboardKpis(BaseModel):
    total_fuel_cost: float
    total_maintenance_cost: float
    operational_cost: float
    average_cost_per_vehicle: float
    fleet_roi_pct: float
    monthly_expenses: float


class FinanceDashboardData(BaseModel):
    kpis: FinanceDashboardKpis
    fuel_cost_trend: list[TrendPoint]
    maintenance_cost_trend: list[TrendPoint]
    roi_by_vehicle: list[NamedCount]
    cost_breakdown: list[NamedCount]


class DashboardOverview(BaseModel):
    role: str
    view: str  # fleet | driver | safety | finance
    fleet: Optional[FleetDashboardData] = None
    driver: Optional[DriverDashboardData] = None
    safety: Optional[SafetyDashboardData] = None
    finance: Optional[FinanceDashboardData] = None


# ============================================================
# ANALYTICS (deep analysis — why is this happening?)
# ============================================================
class FleetAnalyticsData(BaseModel):
    utilization_trend: list[TrendPoint]
    vehicle_usage: list[NamedCount]
    maintenance_frequency: list[NamedCount]
    downtime_analysis: list[NamedCount]
    vehicle_availability: list[NamedCount]
    cost_per_km: list[NamedCount]
    filter_options: dict[str, list[str]]


class DriverAnalyticsTrip(BaseModel):
    trip_id: UUID
    label: str
    status: str
    distance_km: Optional[float] = None
    start_time: datetime


class DriverAnalyticsData(BaseModel):
    linked: bool = False
    driver_name: Optional[str] = None
    trips_completed: int = 0
    distance_travelled_km: float = 0
    fuel_consumption_cost: float = 0
    fuel_liters: float = 0
    average_fuel_efficiency: float = 0  # km per liter
    my_trips: list[DriverAnalyticsTrip] = []


class SafetyAnalyticsData(BaseModel):
    license_expiry_trend: list[TrendPoint]
    safety_score_trend: list[TrendPoint]
    violations: list[NamedCount]
    suspended_drivers: list[NamedCount]
    average_driver_rating: float
    suspended_count: int = 0
    violation_count: int = 0


class FinanceAnalyticsData(BaseModel):
    fuel_cost_over_time: list[TrendPoint]
    maintenance_cost: list[TrendPoint]
    expense_breakdown: list[NamedCount]
    operational_cost_trend: list[TrendPoint]
    roi_per_vehicle: list[NamedCount]
    top_costly_vehicles: list[NamedCount]
    fuel_efficiency_comparison: list[NamedCount]
    monthly_profitability: list[TrendPoint]


class AnalyticsOverview(BaseModel):
    role: str
    view: str
    fleet: Optional[FleetAnalyticsData] = None
    driver: Optional[DriverAnalyticsData] = None
    safety: Optional[SafetyAnalyticsData] = None
    finance: Optional[FinanceAnalyticsData] = None


# ============================================================
# SETTINGS — Organization preferences
# ============================================================
class GeneralSettings(BaseModel):
    depot_name: str = "Gandhinagar Depot GJ4"
    currency: str = "INR (Rs)"
    distance_unit: str = "Kilometers"


class GeneralSettingsUpdate(BaseModel):
    depot_name: Optional[str] = None
    currency: Optional[str] = None
    distance_unit: Optional[str] = None


# ============================================================
# NOTIFICATIONS
# ============================================================
class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    message: str
    is_read: bool
    category: str
    event_type: str
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    permission_key: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UnreadCountResponse(BaseModel):
    count: int
