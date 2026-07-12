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
    status: str = "ACTIVE"

class VehicleUpdate(BaseModel):
    vin: Optional[str] = None
    license_plate: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    status: Optional[str] = None

class VehicleResponse(BaseModel):
    id: UUID
    vin: str
    license_plate: str
    make: str
    model: str
    year: int
    status: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ============================================================
# DRIVERS
# ============================================================
class DriverCreate(BaseModel):
    user_id: UUID
    license_number: str
    status: str = "ACTIVE"

class DriverUpdate(BaseModel):
    license_number: Optional[str] = None
    status: Optional[str] = None

class DriverResponse(BaseModel):
    id: UUID
    user_id: UUID
    license_number: str
    status: str
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
    status: str = "PLANNED"

class TripUpdate(BaseModel):
    origin: Optional[str] = None
    destination: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None

class TripResponse(BaseModel):
    id: UUID
    vehicle_id: UUID
    driver_id: UUID
    origin: str
    destination: str
    start_time: datetime
    end_time: Optional[datetime]
    status: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ============================================================
# MAINTENANCE
# ============================================================
class MaintenanceCreate(BaseModel):
    vehicle_id: UUID
    description: str
    scheduled_date: date
    cost: Optional[float] = None
    status: str = "SCHEDULED"

class MaintenanceUpdate(BaseModel):
    description: Optional[str] = None
    scheduled_date: Optional[date] = None
    cost: Optional[float] = None
    status: Optional[str] = None

class MaintenanceResponse(BaseModel):
    id: UUID
    vehicle_id: UUID
    description: str
    scheduled_date: date
    cost: Optional[float]
    status: str
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

class ExpenseResponse(BaseModel):
    id: UUID
    vehicle_id: Optional[UUID]
    trip_id: Optional[UUID]
    expense_type: str
    amount: float
    date_incurred: date
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# ============================================================
# FUEL LOGS
# ============================================================
class FuelLogCreate(BaseModel):
    vehicle_id: UUID
    gallons: float
    cost: float
    date_filled: date

class FuelLogUpdate(BaseModel):
    gallons: Optional[float] = None
    cost: Optional[float] = None
    date_filled: Optional[date] = None

class FuelLogResponse(BaseModel):
    id: UUID
    vehicle_id: UUID
    gallons: float
    cost: float
    date_filled: date
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

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
