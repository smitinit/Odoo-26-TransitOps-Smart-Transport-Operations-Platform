"""
TransitOps — All business module CRUD routers.
Hackathon-speed: one file, all endpoints.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID

from app.database.session import get_db
from app.shared.responses import SuccessResponse
from app.shared.exceptions import NotFoundException, AppException
from app.api.dependencies.auth import get_current_user, get_current_active_superuser
from app.modules.users.models import User
from app.modules.users.schemas import UserCreate, UserUpdate, UserResponse
from app.modules.users.service import user_service
from app.core.security import get_password_hash

# Models
from app.modules.fleet.models import Vehicle
from app.modules.drivers.models import Driver
from app.modules.trips.models import Trip
from app.modules.maintenance.models import Maintenance
from app.modules.finance.models import Expense, FuelLog
from app.modules.roles.models import Role

# Schemas
from app.api.v1.schemas import (
    VehicleCreate, VehicleUpdate, VehicleResponse,
    DriverCreate, DriverUpdate, DriverResponse,
    TripCreate, TripUpdate, TripResponse,
    MaintenanceCreate, MaintenanceUpdate, MaintenanceResponse,
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    FuelLogCreate, FuelLogUpdate, FuelLogResponse,
    RoleResponse, DashboardStats,
)

router = APIRouter()

# ============================================================
# HELPER: Generic CRUD factory (keeps things DRY)
# ============================================================
async def _get_or_404(db: AsyncSession, model, id: UUID):
    result = await db.execute(select(model).where(model.id == id))
    obj = result.scalar_one_or_none()
    if not obj:
        raise NotFoundException(message=f"{model.__name__} with id {id} not found")
    return obj

async def _list_all(db: AsyncSession, model, skip: int, limit: int):
    result = await db.execute(select(model).offset(skip).limit(limit))
    return result.scalars().all()

async def _create(db: AsyncSession, model, data: dict):
    obj = model(**data)
    db.add(obj)
    await db.commit()
    await db.refresh(obj)
    return obj

async def _update(db: AsyncSession, obj, data: dict):
    for key, value in data.items():
        if value is not None:
            setattr(obj, key, value)
    try:
        db.add(obj)
        await db.commit()
        await db.refresh(obj)
    except Exception as e:
        await db.rollback()
        raise AppException(message=f"Update failed: {str(e)}", status_code=400)
    return obj

async def _delete(db: AsyncSession, obj):
    await db.delete(obj)
    await db.commit()


# ============================================================
# USERS — Admin create / list / update / delete
# ============================================================
users_router = APIRouter(prefix="/users", tags=["Users"])

@users_router.post("", response_model=SuccessResponse[UserResponse], status_code=201)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser),
):
    """Create a new user (admin only)."""
    user = await user_service.create_user(db, obj_in=body)
    return SuccessResponse(message="User created successfully", data=user)

@users_router.get("", response_model=SuccessResponse[list[UserResponse]])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser),
):
    """List all users (admin only)."""
    result = await db.execute(
        select(User)
        .where(User.deleted_at.is_(None))
        .offset(skip)
        .limit(limit)
        .order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    return SuccessResponse(message="Users retrieved successfully", data=users)

@users_router.get("/{user_id}", response_model=SuccessResponse[UserResponse])
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser),
):
    """Get a user by id (admin only)."""
    try:
        user = await user_service.get_by_id(db, id=user_id)
    except NotFoundException:
        raise NotFoundException(message=f"User with id {user_id} not found")
    if user.deleted_at is not None:
        raise NotFoundException(message=f"User with id {user_id} not found")
    return SuccessResponse(message="User retrieved successfully", data=user)

@users_router.patch("/{user_id}", response_model=SuccessResponse[UserResponse])
async def update_user(
    user_id: UUID,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser),
):
    """Update a user (admin only)."""
    user = await user_service.update_user(db, user_id=user_id, obj_in=body)
    return SuccessResponse(message="User updated successfully", data=user)

@users_router.delete("/{user_id}", response_model=SuccessResponse[UserResponse])
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_superuser),
):
    """Soft-delete a user (admin only)."""
    if current_user.id == user_id:
        raise AppException(message="You cannot delete your own account", status_code=400)
    try:
        user = await user_service.get_by_id(db, id=user_id)
    except NotFoundException:
        raise NotFoundException(message=f"User with id {user_id} not found")
    if user.deleted_at is not None:
        raise NotFoundException(message=f"User with id {user_id} not found")
    deleted = await user_service.delete(db, id=user_id)
    return SuccessResponse(message="User deleted successfully", data=deleted)


# ============================================================
# ROLES — Read-only
# ============================================================
roles_router = APIRouter(prefix="/roles", tags=["Roles"])

@roles_router.get("", response_model=SuccessResponse[list[RoleResponse]])
async def list_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all available roles."""
    roles = await _list_all(db, Role, 0, 100)
    return SuccessResponse(message="Roles retrieved successfully", data=roles)


# ============================================================
# VEHICLES
# ============================================================
vehicles_router = APIRouter(prefix="/vehicles", tags=["Fleet"])

@vehicles_router.get("", response_model=SuccessResponse[list[VehicleResponse]])
async def list_vehicles(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicles = await _list_all(db, Vehicle, skip, limit)
    return SuccessResponse(message="Vehicles retrieved successfully", data=vehicles)

@vehicles_router.post("", response_model=SuccessResponse[VehicleResponse], status_code=201)
async def create_vehicle(
    body: VehicleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = await _create(db, Vehicle, body.model_dump())
    return SuccessResponse(message="Vehicle created successfully", data=vehicle)

@vehicles_router.get("/{vehicle_id}", response_model=SuccessResponse[VehicleResponse])
async def get_vehicle(
    vehicle_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = await _get_or_404(db, Vehicle, vehicle_id)
    return SuccessResponse(message="Vehicle retrieved successfully", data=vehicle)

@vehicles_router.patch("/{vehicle_id}", response_model=SuccessResponse[VehicleResponse])
async def update_vehicle(
    vehicle_id: UUID,
    body: VehicleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = await _get_or_404(db, Vehicle, vehicle_id)
    vehicle = await _update(db, vehicle, body.model_dump(exclude_unset=True))
    return SuccessResponse(message="Vehicle updated successfully", data=vehicle)

@vehicles_router.delete("/{vehicle_id}", response_model=SuccessResponse)
async def delete_vehicle(
    vehicle_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = await _get_or_404(db, Vehicle, vehicle_id)
    await _delete(db, vehicle)
    return SuccessResponse(message="Vehicle deleted successfully")


# ============================================================
# DRIVERS
# ============================================================
drivers_router = APIRouter(prefix="/drivers", tags=["Drivers"])

@drivers_router.get("", response_model=SuccessResponse[list[DriverResponse]])
async def list_drivers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    drivers = await _list_all(db, Driver, skip, limit)
    return SuccessResponse(message="Drivers retrieved successfully", data=drivers)

@drivers_router.post("", response_model=SuccessResponse[DriverResponse], status_code=201)
async def create_driver(
    body: DriverCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    driver = await _create(db, Driver, body.model_dump())
    return SuccessResponse(message="Driver created successfully", data=driver)

@drivers_router.get("/{driver_id}", response_model=SuccessResponse[DriverResponse])
async def get_driver(
    driver_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    driver = await _get_or_404(db, Driver, driver_id)
    return SuccessResponse(message="Driver retrieved successfully", data=driver)

@drivers_router.patch("/{driver_id}", response_model=SuccessResponse[DriverResponse])
async def update_driver(
    driver_id: UUID,
    body: DriverUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    driver = await _get_or_404(db, Driver, driver_id)
    driver = await _update(db, driver, body.model_dump(exclude_unset=True))
    return SuccessResponse(message="Driver updated successfully", data=driver)

@drivers_router.delete("/{driver_id}", response_model=SuccessResponse)
async def delete_driver(
    driver_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    driver = await _get_or_404(db, Driver, driver_id)
    await _delete(db, driver)
    return SuccessResponse(message="Driver deleted successfully")


# ============================================================
# TRIPS
# ============================================================
trips_router = APIRouter(prefix="/trips", tags=["Trips"])

@trips_router.get("", response_model=SuccessResponse[list[TripResponse]])
async def list_trips(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trips = await _list_all(db, Trip, skip, limit)
    return SuccessResponse(message="Trips retrieved successfully", data=trips)

@trips_router.post("", response_model=SuccessResponse[TripResponse], status_code=201)
async def create_trip(
    body: TripCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = await _create(db, Trip, body.model_dump())
    return SuccessResponse(message="Trip created successfully", data=trip)

@trips_router.get("/{trip_id}", response_model=SuccessResponse[TripResponse])
async def get_trip(
    trip_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = await _get_or_404(db, Trip, trip_id)
    return SuccessResponse(message="Trip retrieved successfully", data=trip)

@trips_router.patch("/{trip_id}", response_model=SuccessResponse[TripResponse])
async def update_trip(
    trip_id: UUID,
    body: TripUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = await _get_or_404(db, Trip, trip_id)
    trip = await _update(db, trip, body.model_dump(exclude_unset=True))
    return SuccessResponse(message="Trip updated successfully", data=trip)

@trips_router.delete("/{trip_id}", response_model=SuccessResponse)
async def delete_trip(
    trip_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = await _get_or_404(db, Trip, trip_id)
    await _delete(db, trip)
    return SuccessResponse(message="Trip deleted successfully")


# ============================================================
# MAINTENANCE
# ============================================================
maintenance_router = APIRouter(prefix="/maintenance", tags=["Maintenance"])

@maintenance_router.get("", response_model=SuccessResponse[list[MaintenanceResponse]])
async def list_maintenance(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = await _list_all(db, Maintenance, skip, limit)
    return SuccessResponse(message="Maintenance records retrieved successfully", data=records)

@maintenance_router.post("", response_model=SuccessResponse[MaintenanceResponse], status_code=201)
async def create_maintenance(
    body: MaintenanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = await _create(db, Maintenance, body.model_dump())
    return SuccessResponse(message="Maintenance record created successfully", data=record)

@maintenance_router.get("/{record_id}", response_model=SuccessResponse[MaintenanceResponse])
async def get_maintenance(
    record_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = await _get_or_404(db, Maintenance, record_id)
    return SuccessResponse(message="Maintenance record retrieved successfully", data=record)

@maintenance_router.patch("/{record_id}", response_model=SuccessResponse[MaintenanceResponse])
async def update_maintenance(
    record_id: UUID,
    body: MaintenanceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = await _get_or_404(db, Maintenance, record_id)
    record = await _update(db, record, body.model_dump(exclude_unset=True))
    return SuccessResponse(message="Maintenance record updated successfully", data=record)

@maintenance_router.delete("/{record_id}", response_model=SuccessResponse)
async def delete_maintenance(
    record_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = await _get_or_404(db, Maintenance, record_id)
    await _delete(db, record)
    return SuccessResponse(message="Maintenance record deleted successfully")


# ============================================================
# EXPENSES
# ============================================================
expenses_router = APIRouter(prefix="/expenses", tags=["Finance"])

@expenses_router.get("", response_model=SuccessResponse[list[ExpenseResponse]])
async def list_expenses(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expenses = await _list_all(db, Expense, skip, limit)
    return SuccessResponse(message="Expenses retrieved successfully", data=expenses)

@expenses_router.post("", response_model=SuccessResponse[ExpenseResponse], status_code=201)
async def create_expense(
    body: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = await _create(db, Expense, body.model_dump())
    return SuccessResponse(message="Expense created successfully", data=expense)

@expenses_router.get("/{expense_id}", response_model=SuccessResponse[ExpenseResponse])
async def get_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = await _get_or_404(db, Expense, expense_id)
    return SuccessResponse(message="Expense retrieved successfully", data=expense)

@expenses_router.delete("/{expense_id}", response_model=SuccessResponse)
async def delete_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    expense = await _get_or_404(db, Expense, expense_id)
    await _delete(db, expense)
    return SuccessResponse(message="Expense deleted successfully")


# ============================================================
# FUEL LOGS
# ============================================================
fuel_router = APIRouter(prefix="/fuel-logs", tags=["Finance"])

@fuel_router.get("", response_model=SuccessResponse[list[FuelLogResponse]])
async def list_fuel_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logs = await _list_all(db, FuelLog, skip, limit)
    return SuccessResponse(message="Fuel logs retrieved successfully", data=logs)

@fuel_router.post("", response_model=SuccessResponse[FuelLogResponse], status_code=201)
async def create_fuel_log(
    body: FuelLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = await _create(db, FuelLog, body.model_dump())
    return SuccessResponse(message="Fuel log created successfully", data=log)

@fuel_router.get("/{log_id}", response_model=SuccessResponse[FuelLogResponse])
async def get_fuel_log(
    log_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = await _get_or_404(db, FuelLog, log_id)
    return SuccessResponse(message="Fuel log retrieved successfully", data=log)

@fuel_router.delete("/{log_id}", response_model=SuccessResponse)
async def delete_fuel_log(
    log_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = await _get_or_404(db, FuelLog, log_id)
    await _delete(db, log)
    return SuccessResponse(message="Fuel log deleted successfully")


# ============================================================
# DASHBOARD — Aggregated stats
# ============================================================
dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@dashboard_router.get("/stats", response_model=SuccessResponse[DashboardStats])
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get aggregated dashboard statistics."""
    total_vehicles = (await db.execute(select(func.count()).select_from(Vehicle))).scalar() or 0
    active_vehicles = (await db.execute(
        select(func.count()).select_from(Vehicle).where(Vehicle.status == "ACTIVE")
    )).scalar() or 0

    total_drivers = (await db.execute(select(func.count()).select_from(Driver))).scalar() or 0
    active_drivers = (await db.execute(
        select(func.count()).select_from(Driver).where(Driver.status == "ACTIVE")
    )).scalar() or 0

    total_trips = (await db.execute(select(func.count()).select_from(Trip))).scalar() or 0
    trips_in_progress = (await db.execute(
        select(func.count()).select_from(Trip).where(Trip.status == "IN_PROGRESS")
    )).scalar() or 0

    pending_maintenance = (await db.execute(
        select(func.count()).select_from(Maintenance).where(Maintenance.status == "SCHEDULED")
    )).scalar() or 0

    total_expenses = (await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0)).select_from(Expense)
    )).scalar() or 0.0

    stats = DashboardStats(
        total_vehicles=total_vehicles,
        active_vehicles=active_vehicles,
        total_drivers=total_drivers,
        active_drivers=active_drivers,
        total_trips=total_trips,
        trips_in_progress=trips_in_progress,
        pending_maintenance=pending_maintenance,
        total_expenses=float(total_expenses),
    )
    return SuccessResponse(message="Dashboard stats retrieved successfully", data=stats)


# ============================================================
# Wire all sub-routers into the main router
# ============================================================
router.include_router(users_router)
router.include_router(roles_router)
router.include_router(vehicles_router)
router.include_router(drivers_router)
router.include_router(trips_router)
router.include_router(maintenance_router)
router.include_router(expenses_router)
router.include_router(fuel_router)
router.include_router(dashboard_router)
