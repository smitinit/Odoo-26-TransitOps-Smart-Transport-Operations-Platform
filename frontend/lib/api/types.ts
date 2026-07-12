export type TokenResponse = {
  access_token: string
  refresh_token: string
  token_type: string
}

export type ApiSuccess<T> = {
  success: true
  message: string
  data: T
}

export type ApiErrorBody = {
  success: false
  message: string
  errors?: unknown[]
}

export type User = {
  id: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
  is_superuser: boolean
  role_id: string | null
  role_name?: string | null
  permissions?: string[]
  created_at?: string
  updated_at?: string
}

export type Role = {
  id: string
  name: string
  description: string | null
  created_at?: string
}

export type UserCreateInput = {
  email: string
  first_name: string
  last_name: string
  password: string
  is_active?: boolean
  is_superuser?: boolean
  role_id?: string | null
}

export type UserUpdateInput = {
  email?: string
  first_name?: string
  last_name?: string
  password?: string
  is_active?: boolean
  is_superuser?: boolean
  role_id?: string | null
}

export type VehicleStatus = "ACTIVE" | "ON_TRIP" | "MAINTENANCE" | "INACTIVE"

export type Vehicle = {
  id: string
  vin: string
  license_plate: string
  make: string
  model: string
  year: number
  vehicle_type: string
  capacity: string
  odometer: number
  acquisition_cost: number
  status: VehicleStatus
  created_at?: string
  updated_at?: string
}

export type VehicleCreateInput = {
  vin: string
  license_plate: string
  make: string
  model: string
  year: number
  vehicle_type?: string
  capacity?: string
  odometer?: number
  acquisition_cost?: number
  status?: VehicleStatus
}

export type VehicleUpdateInput = Partial<VehicleCreateInput>

export type VehicleListParams = {
  skip?: number
  limit?: number
  status?: string
  type?: string
  search?: string
}

export type DriverStatus =
  | "AVAILABLE"
  | "ON_TRIP"
  | "OFF_DUTY"
  | "SUSPENDED"
  | "ACTIVE"
  | "ON_LEAVE"
  | "TERMINATED"

export type Driver = {
  id: string
  user_id: string | null
  first_name: string
  last_name: string
  license_number: string
  license_category: string
  license_expiry: string | null
  contact_number: string
  safety_score: number
  trip_completion_pct: number | null
  status: DriverStatus
  license_expired: boolean
  created_at?: string
  updated_at?: string
}

export type DriverCreateInput = {
  first_name: string
  last_name: string
  license_number: string
  license_category?: string
  license_expiry?: string | null
  contact_number?: string
  safety_score?: number
  trip_completion_pct?: number | null
  user_id?: string | null
  status?: DriverStatus
}

export type DriverUpdateInput = Partial<DriverCreateInput>

export type DriverListParams = {
  skip?: number
  limit?: number
  status?: string
  search?: string
}

export type TripStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"

export type Trip = {
  id: string
  vehicle_id: string
  driver_id: string
  origin: string
  destination: string
  start_time: string
  end_time: string | null
  load_type: string
  cargo_weight_kg: number
  planned_distance_km: number | null
  status: TripStatus
  vehicle_reg?: string | null
  vehicle_model?: string | null
  vehicle_capacity?: string | null
  driver_name?: string | null
  created_at?: string
  updated_at?: string
}

export type TripCreateInput = {
  vehicle_id: string
  driver_id: string
  origin: string
  destination: string
  start_time: string
  end_time?: string | null
  load_type?: string
  cargo_weight_kg?: number
  planned_distance_km?: number | null
  status?: TripStatus
}

export type TripUpdateInput = Partial<TripCreateInput>

export type TripListParams = {
  skip?: number
  limit?: number
  status?: string
}

export type MaintenanceStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"

export type MaintenanceRecord = {
  id: string
  vehicle_id: string
  maintenance_type: string
  description: string
  scheduled_date: string
  cost: number | null
  status: MaintenanceStatus
  vehicle_reg?: string | null
  vehicle_model?: string | null
  created_at?: string
  updated_at?: string
}

export type MaintenanceCreateInput = {
  vehicle_id: string
  maintenance_type?: string
  description: string
  scheduled_date: string
  cost?: number | null
  status?: MaintenanceStatus
}

export type MaintenanceUpdateInput = Partial<MaintenanceCreateInput>

export type MaintenanceListParams = {
  skip?: number
  limit?: number
  status?: string
}

export type FuelLog = {
  id: string
  vehicle_id: string
  liters: number
  cost: number
  date_filled: string
  vehicle_reg?: string | null
  vehicle_model?: string | null
  created_at?: string
  updated_at?: string
}

export type FuelLogCreateInput = {
  vehicle_id: string
  liters: number
  cost: number
  date_filled: string
}

export type ExpenseType = "FUEL" | "MAINTENANCE" | "TOLL" | "OTHER"

export type Expense = {
  id: string
  vehicle_id: string | null
  trip_id: string | null
  expense_type: ExpenseType | string
  amount: number
  date_incurred: string
  description: string | null
  vehicle_reg?: string | null
  vehicle_model?: string | null
  trip_label?: string | null
  created_at?: string
  updated_at?: string
}

export type ExpenseCreateInput = {
  vehicle_id?: string | null
  trip_id?: string | null
  expense_type: ExpenseType | string
  amount: number
  date_incurred: string
  description?: string | null
}

export type OpsCostSummary = {
  total_fuel_cost: number
  total_maintenance_cost: number
  total_toll_cost: number
  total_other_cost: number
  total_operational_cost: number
}

export type NamedCount = { name: string; value: number }
export type TrendPoint = { label: string; value: number }

export type FleetDashboardData = {
  kpis: {
    active_vehicles: number
    available_vehicles: number
    vehicles_in_shop: number
    retired_vehicles: number
    drivers_on_duty: number
    active_trips: number
    pending_trips: number
    fleet_utilization_pct: number
  }
  charts: {
    vehicle_status: NamedCount[]
    trips_by_region: NamedCount[]
    utilization_trend: TrendPoint[]
    vehicles_near_maintenance: NamedCount[]
  }
  filter_options: {
    vehicle_types: string[]
    statuses: string[]
    regions: string[]
  }
}

export type DriverDashboardData = {
  driver_name?: string | null
  linked: boolean
  active_trip?: {
    trip_id?: string | null
    trip_label?: string | null
    status?: string | null
    vehicle_reg?: string | null
    vehicle_model?: string | null
    distance_remaining_km?: number | null
    fuel_consumed_cost: number
    origin?: string | null
    destination?: string | null
  } | null
  today_trips: {
    trip_id: string
    label: string
    status: string
    start_time: string
    vehicle_reg?: string | null
  }[]
  fuel_consumed_today: number
  expense_today: number
}

export type SafetyDashboardData = {
  kpis: {
    expired_licenses: number
    expiring_soon: number
    suspended_drivers: number
    drivers_on_trip: number
    average_safety_score: number
  }
  license_expiry_timeline: TrendPoint[]
  safety_score_distribution: NamedCount[]
}

export type FinanceDashboardData = {
  kpis: {
    total_fuel_cost: number
    total_maintenance_cost: number
    operational_cost: number
    average_cost_per_vehicle: number
    fleet_roi_pct: number
    monthly_expenses: number
  }
  fuel_cost_trend: TrendPoint[]
  maintenance_cost_trend: TrendPoint[]
  roi_by_vehicle: NamedCount[]
  cost_breakdown: NamedCount[]
}

export type DashboardOverview = {
  role: string
  view: "fleet" | "driver" | "safety" | "finance" | string
  fleet?: FleetDashboardData | null
  driver?: DriverDashboardData | null
  safety?: SafetyDashboardData | null
  finance?: FinanceDashboardData | null
}

export type DashboardOverviewParams = {
  vehicle_type?: string
  status?: string
  region?: string
}

export type FleetAnalyticsData = {
  utilization_trend: TrendPoint[]
  vehicle_usage: NamedCount[]
  maintenance_frequency: NamedCount[]
  downtime_analysis: NamedCount[]
  vehicle_availability: NamedCount[]
  cost_per_km: NamedCount[]
  filter_options: {
    vehicles: string[]
    vehicle_types: string[]
    regions: string[]
  }
}

export type DriverAnalyticsData = {
  linked: boolean
  driver_name?: string | null
  trips_completed: number
  distance_travelled_km: number
  fuel_consumption_cost: number
  fuel_liters: number
  average_fuel_efficiency: number
  my_trips: {
    trip_id: string
    label: string
    status: string
    distance_km?: number | null
    start_time: string
  }[]
}

export type SafetyAnalyticsData = {
  license_expiry_trend: TrendPoint[]
  safety_score_trend: TrendPoint[]
  violations: NamedCount[]
  suspended_drivers: NamedCount[]
  average_driver_rating: number
  suspended_count: number
  violation_count: number
}

export type FinanceAnalyticsData = {
  fuel_cost_over_time: TrendPoint[]
  maintenance_cost: TrendPoint[]
  expense_breakdown: NamedCount[]
  operational_cost_trend: TrendPoint[]
  roi_per_vehicle: NamedCount[]
  top_costly_vehicles: NamedCount[]
  fuel_efficiency_comparison: NamedCount[]
  monthly_profitability: TrendPoint[]
}

export type AnalyticsOverview = {
  role: string
  view: "fleet" | "driver" | "safety" | "finance" | string
  fleet?: FleetAnalyticsData | null
  driver?: DriverAnalyticsData | null
  safety?: SafetyAnalyticsData | null
  finance?: FinanceAnalyticsData | null
}

export type AnalyticsOverviewParams = {
  vehicle_id?: string
  vehicle_type?: string
  region?: string
  date_from?: string
  date_to?: string
}

export type GeneralSettings = {
  depot_name: string
  currency: string
  distance_unit: string
}

export type GeneralSettingsUpdate = Partial<GeneralSettings>

export type NotificationCategory =
  | "trip"
  | "vehicle"
  | "driver"
  | "maintenance"
  | "fuel"
  | "expense"
  | "system"
  | string

export type AppNotification = {
  id: string
  user_id: string
  title: string
  message: string
  is_read: boolean
  category: NotificationCategory
  event_type: string
  entity_type?: string | null
  entity_id?: string | null
  permission_key?: string | null
  created_at: string
  updated_at: string
}

export type UnreadCount = {
  count: number
}

export class ApiError extends Error {
  status: number
  errors: unknown[]

  constructor(message: string, status: number, errors: unknown[] = []) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.errors = errors
  }
}
