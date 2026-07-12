"""
TransitOps — All business module CRUD routers.
Hackathon-speed: one file, all endpoints.
"""
from datetime import date as date_cls
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from uuid import UUID

from app.database.session import get_db
from app.shared.responses import SuccessResponse
from app.shared.exceptions import NotFoundException, AppException
from app.api.dependencies.auth import (
    get_current_user,
    get_current_active_superuser,
    require_permission,
)
from app.modules.users.models import User
from app.modules.users.schemas import UserCreate, UserUpdate, UserResponse
from app.modules.users.service import user_service
from app.core.security import get_password_hash

# Models
from app.shared.base.model import SoftDeleteMixin
from app.modules.fleet.models import Vehicle, VehicleStatus
from app.modules.drivers.models import Driver, DriverStatus
from app.modules.trips.models import Trip, TripStatus
from app.modules.trips.rules import (
    assert_cargo_fits,
    assert_driver_dispatchable,
    assert_vehicle_dispatchable,
)
from app.modules.maintenance.models import Maintenance, MaintenanceStatus
from app.modules.finance.models import Expense, FuelLog, ExpenseType
from app.modules.roles.models import Role

# Schemas
from app.api.v1.schemas import (
    VehicleCreate, VehicleUpdate, VehicleResponse,
    DriverCreate, DriverUpdate, DriverResponse,
    TripCreate, TripUpdate, TripResponse,
    MaintenanceCreate, MaintenanceUpdate, MaintenanceResponse,
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    FuelLogCreate, FuelLogUpdate, FuelLogResponse,
    RoleResponse, DashboardStats, OpsCostSummary, DashboardOverview,
    AnalyticsOverview, GeneralSettings, GeneralSettingsUpdate,
)
from app.api.v1.dashboard_service import build_dashboard_overview
from app.api.v1.analytics_service import build_analytics_overview
from app.modules.settings.models import Setting
from app.modules.notifications.router import notifications_router
from app.modules.notifications.service import notify_permission_holders

GENERAL_SETTINGS_KEY = "general"
DEFAULT_GENERAL_SETTINGS = GeneralSettings()

router = APIRouter()

# ============================================================
# HELPER: Generic CRUD factory (keeps things DRY)
# ============================================================
async def _get_or_404(db: AsyncSession, model, id: UUID):
    result = await db.execute(select(model).where(model.id == id))
    obj = result.scalar_one_or_none()
    if not obj or (
        isinstance(obj, SoftDeleteMixin) and obj.deleted_at is not None
    ):
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
    """Soft-delete when supported; otherwise hard-delete with FK-safe error handling.

    Vehicles/drivers use SoftDeleteMixin so related trips (RESTRICT FKs) stay valid.
    """
    try:
        if isinstance(obj, SoftDeleteMixin):
            obj.deleted_at = datetime.now(timezone.utc)
            db.add(obj)
        else:
            await db.delete(obj)
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise AppException(
            message=(
                "Cannot delete: this record is still referenced by related data "
                "(for example trips, fuel logs, or expenses). Remove or reassign "
                "those records first."
            ),
            status_code=409,
        ) from exc


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
    status: str | None = Query(None),
    vehicle_type: str | None = Query(None, alias="type"),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("vehicle.read")),
):
    query = select(Vehicle).where(Vehicle.deleted_at.is_(None))
    if status and status != "ALL":
        query = query.where(Vehicle.status == status)
    if vehicle_type and vehicle_type != "ALL":
        query = query.where(Vehicle.vehicle_type == vehicle_type)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.where(Vehicle.license_plate.ilike(pattern))
    result = await db.execute(query.offset(skip).limit(limit).order_by(Vehicle.created_at.desc()))
    vehicles = result.scalars().all()
    return SuccessResponse(message="Vehicles retrieved successfully", data=vehicles)

@vehicles_router.post("", response_model=SuccessResponse[VehicleResponse], status_code=201)
async def create_vehicle(
    body: VehicleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("vehicle.create")),
):
    data = body.model_dump()
    data["status"] = VehicleStatus(data["status"])
    try:
        vehicle = await _create(db, Vehicle, data)
    except Exception as e:
        await db.rollback()
        raise AppException(
            message=f"Could not create vehicle (check unique VIN / registration): {e}",
            status_code=400,
        )
    await notify_permission_holders(
        db,
        permission="vehicle.read",
        category="vehicle",
        event_type="vehicle.created",
        title=f"Vehicle {vehicle.license_plate} added",
        message=f"{vehicle.make} {vehicle.model} registered as {vehicle.vehicle_type}.",
        entity_type="vehicle",
        entity_id=vehicle.id,
        exclude_user_id=current_user.id,
    )
    return SuccessResponse(message="Vehicle created successfully", data=vehicle)

@vehicles_router.get("/{vehicle_id}", response_model=SuccessResponse[VehicleResponse])
async def get_vehicle(
    vehicle_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("vehicle.read")),
):
    vehicle = await _get_or_404(db, Vehicle, vehicle_id)
    return SuccessResponse(message="Vehicle retrieved successfully", data=vehicle)

@vehicles_router.patch("/{vehicle_id}", response_model=SuccessResponse[VehicleResponse])
async def update_vehicle(
    vehicle_id: UUID,
    body: VehicleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("vehicle.update")),
):
    vehicle = await _get_or_404(db, Vehicle, vehicle_id)
    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        data["status"] = VehicleStatus(data["status"])
    vehicle = await _update(db, vehicle, data)
    status_label = (
        vehicle.status.value if hasattr(vehicle.status, "value") else str(vehicle.status)
    )
    await notify_permission_holders(
        db,
        permission="vehicle.read",
        category="vehicle",
        event_type="vehicle.updated",
        title=f"Vehicle {vehicle.license_plate} updated",
        message=f"Status is now {status_label}.",
        entity_type="vehicle",
        entity_id=vehicle.id,
        exclude_user_id=current_user.id,
    )
    return SuccessResponse(message="Vehicle updated successfully", data=vehicle)

@vehicles_router.delete("/{vehicle_id}", response_model=SuccessResponse)
async def delete_vehicle(
    vehicle_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("vehicle.delete")),
):
    vehicle = await _get_or_404(db, Vehicle, vehicle_id)
    plate = vehicle.license_plate
    vehicle_id_copy = vehicle.id
    await _delete(db, vehicle)
    await notify_permission_holders(
        db,
        permission="vehicle.read",
        category="vehicle",
        event_type="vehicle.deleted",
        title=f"Vehicle {plate} deleted",
        message=f"Registration {plate} was removed from the fleet.",
        entity_type="vehicle",
        entity_id=vehicle_id_copy,
        exclude_user_id=current_user.id,
    )
    return SuccessResponse(message="Vehicle deleted successfully")


# ============================================================
# DRIVERS
# ============================================================
drivers_router = APIRouter(prefix="/drivers", tags=["Drivers"])

def _driver_response(driver: Driver) -> DriverResponse:
    expired = bool(
        driver.license_expiry and driver.license_expiry < date_cls.today()
    )
    return DriverResponse(
        id=driver.id,
        user_id=driver.user_id,
        first_name=driver.first_name,
        last_name=driver.last_name,
        license_number=driver.license_number,
        license_category=driver.license_category,
        license_expiry=driver.license_expiry,
        contact_number=driver.contact_number,
        safety_score=driver.safety_score,
        trip_completion_pct=driver.trip_completion_pct,
        status=driver.status.value if hasattr(driver.status, "value") else str(driver.status),
        license_expired=expired,
        created_at=driver.created_at,
        updated_at=driver.updated_at,
    )

@drivers_router.get("", response_model=SuccessResponse[list[DriverResponse]])
async def list_drivers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: str | None = Query(None),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("driver.read")),
):
    query = select(Driver).where(Driver.deleted_at.is_(None))
    if status and status != "ALL":
        query = query.where(Driver.status == status)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.where(
            (Driver.first_name.ilike(pattern))
            | (Driver.last_name.ilike(pattern))
            | (Driver.license_number.ilike(pattern))
            | (Driver.contact_number.ilike(pattern))
        )
    result = await db.execute(query.offset(skip).limit(limit).order_by(Driver.created_at.desc()))
    drivers = result.scalars().all()
    return SuccessResponse(
        message="Drivers retrieved successfully",
        data=[_driver_response(d) for d in drivers],
    )

@drivers_router.post("", response_model=SuccessResponse[DriverResponse], status_code=201)
async def create_driver(
    body: DriverCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("driver.create")),
):
    data = body.model_dump()
    data["status"] = DriverStatus(data["status"])
    try:
        driver = await _create(db, Driver, data)
    except Exception as e:
        await db.rollback()
        raise AppException(
            message=f"Could not create driver (check unique license): {e}",
            status_code=400,
        )
    name = f"{driver.first_name} {driver.last_name}".strip()
    await notify_permission_holders(
        db,
        permission="driver.read",
        category="driver",
        event_type="driver.created",
        title=f"Driver {name} added",
        message=f"License {driver.license_number} registered.",
        entity_type="driver",
        entity_id=driver.id,
        exclude_user_id=current_user.id,
    )
    return SuccessResponse(message="Driver created successfully", data=_driver_response(driver))

@drivers_router.get("/{driver_id}", response_model=SuccessResponse[DriverResponse])
async def get_driver(
    driver_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("driver.read")),
):
    driver = await _get_or_404(db, Driver, driver_id)
    return SuccessResponse(message="Driver retrieved successfully", data=_driver_response(driver))

@drivers_router.patch("/{driver_id}", response_model=SuccessResponse[DriverResponse])
async def update_driver(
    driver_id: UUID,
    body: DriverUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("driver.update")),
):
    driver = await _get_or_404(db, Driver, driver_id)
    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        data["status"] = DriverStatus(data["status"])
    driver = await _update(db, driver, data)
    name = f"{driver.first_name} {driver.last_name}".strip()
    status_label = (
        driver.status.value if hasattr(driver.status, "value") else str(driver.status)
    )
    await notify_permission_holders(
        db,
        permission="driver.read",
        category="driver",
        event_type="driver.updated",
        title=f"Driver {name} updated",
        message=f"Status is now {status_label}.",
        entity_type="driver",
        entity_id=driver.id,
        exclude_user_id=current_user.id,
    )
    return SuccessResponse(message="Driver updated successfully", data=_driver_response(driver))

@drivers_router.delete("/{driver_id}", response_model=SuccessResponse)
async def delete_driver(
    driver_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("driver.delete")),
):
    driver = await _get_or_404(db, Driver, driver_id)
    name = f"{driver.first_name} {driver.last_name}".strip()
    driver_id_copy = driver.id
    await _delete(db, driver)
    await notify_permission_holders(
        db,
        permission="driver.read",
        category="driver",
        event_type="driver.deleted",
        title=f"Driver {name} deleted",
        message=f"{name} was removed from the driver registry.",
        entity_type="driver",
        entity_id=driver_id_copy,
        exclude_user_id=current_user.id,
    )
    return SuccessResponse(message="Driver deleted successfully")


# ============================================================
# TRIPS
# ============================================================
trips_router = APIRouter(prefix="/trips", tags=["Trips"])

async def _trip_response(db: AsyncSession, trip: Trip) -> TripResponse:
    vehicle = await db.get(Vehicle, trip.vehicle_id)
    driver = await db.get(Driver, trip.driver_id)
    return TripResponse(
        id=trip.id,
        vehicle_id=trip.vehicle_id,
        driver_id=trip.driver_id,
        origin=trip.origin,
        destination=trip.destination,
        start_time=trip.start_time,
        end_time=trip.end_time,
        load_type=trip.load_type or "",
        cargo_weight_kg=float(trip.cargo_weight_kg or 0),
        planned_distance_km=trip.planned_distance_km,
        status=trip.status.value if hasattr(trip.status, "value") else str(trip.status),
        vehicle_reg=vehicle.license_plate if vehicle else None,
        vehicle_model=vehicle.model if vehicle else None,
        vehicle_capacity=vehicle.capacity if vehicle else None,
        driver_name=(
            f"{driver.first_name} {driver.last_name}".strip() if driver else None
        ),
        created_at=trip.created_at,
        updated_at=trip.updated_at,
    )

async def _apply_status_side_effects(
    db: AsyncSession, trip: Trip, old_status: TripStatus, new_status: TripStatus
):
    vehicle = await db.get(Vehicle, trip.vehicle_id)
    driver = await db.get(Driver, trip.driver_id)
    if not vehicle or not driver:
        return

    if new_status == TripStatus.IN_PROGRESS and old_status != TripStatus.IN_PROGRESS:
        vehicle.status = VehicleStatus.ON_TRIP
        driver.status = DriverStatus.ON_TRIP
    elif new_status in {TripStatus.COMPLETED, TripStatus.CANCELLED} and old_status == TripStatus.IN_PROGRESS:
        if vehicle.status == VehicleStatus.ON_TRIP:
            vehicle.status = VehicleStatus.ACTIVE
        if driver.status == DriverStatus.ON_TRIP:
            driver.status = DriverStatus.AVAILABLE
    db.add(vehicle)
    db.add(driver)

@trips_router.get("", response_model=SuccessResponse[list[TripResponse]])
async def list_trips(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("trip.read")),
):
    query = select(Trip)
    if status and status != "ALL":
        query = query.where(Trip.status == status)
    result = await db.execute(query.offset(skip).limit(limit).order_by(Trip.created_at.desc()))
    trips = result.scalars().all()
    return SuccessResponse(
        message="Trips retrieved successfully",
        data=[await _trip_response(db, t) for t in trips],
    )

@trips_router.post("", response_model=SuccessResponse[TripResponse], status_code=201)
async def create_trip(
    body: TripCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("trip.create")),
):
    vehicle = await _get_or_404(db, Vehicle, body.vehicle_id)
    driver = await _get_or_404(db, Driver, body.driver_id)
    assert_vehicle_dispatchable(vehicle)
    assert_driver_dispatchable(driver)
    assert_cargo_fits(vehicle, body.cargo_weight_kg)

    data = body.model_dump()
    data["status"] = TripStatus(data["status"])
    if data["status"] == TripStatus.IN_PROGRESS:
        # Creating already in transit — validate then flip assets
        pass
    trip = await _create(db, Trip, data)

    if trip.status == TripStatus.IN_PROGRESS:
        await _apply_status_side_effects(db, trip, TripStatus.PLANNED, TripStatus.IN_PROGRESS)
        await db.commit()
        await db.refresh(trip)

    await notify_permission_holders(
        db,
        permission="trip.read",
        category="trip",
        event_type="trip.created",
        title=f"Trip {trip.origin} → {trip.destination} created",
        message=f"New trip scheduled with status {trip.status.value if hasattr(trip.status, 'value') else trip.status}.",
        entity_type="trip",
        entity_id=trip.id,
        exclude_user_id=current_user.id,
    )
    return SuccessResponse(message="Trip created successfully", data=await _trip_response(db, trip))

@trips_router.get("/{trip_id}", response_model=SuccessResponse[TripResponse])
async def get_trip(
    trip_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("trip.read")),
):
    trip = await _get_or_404(db, Trip, trip_id)
    return SuccessResponse(message="Trip retrieved successfully", data=await _trip_response(db, trip))

@trips_router.patch("/{trip_id}", response_model=SuccessResponse[TripResponse])
async def update_trip(
    trip_id: UUID,
    body: TripUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("trip.dispatch")),
):
    trip = await _get_or_404(db, Trip, trip_id)
    old_status = trip.status
    data = body.model_dump(exclude_unset=True)

    if "vehicle_id" in data or "driver_id" in data or "cargo_weight_kg" in data:
        vehicle_id = data.get("vehicle_id", trip.vehicle_id)
        driver_id = data.get("driver_id", trip.driver_id)
        cargo = data.get("cargo_weight_kg", trip.cargo_weight_kg or 0)
        vehicle = await _get_or_404(db, Vehicle, vehicle_id)
        driver = await _get_or_404(db, Driver, driver_id)
        if trip.status != TripStatus.IN_PROGRESS:
            assert_vehicle_dispatchable(vehicle)
            assert_driver_dispatchable(driver)
        assert_cargo_fits(vehicle, float(cargo))

    if "status" in data and data["status"] is not None:
        data["status"] = TripStatus(data["status"])

    trip = await _update(db, trip, data)

    if "status" in data and data["status"] != old_status:
        await _apply_status_side_effects(db, trip, old_status, trip.status)
        await db.commit()
        await db.refresh(trip)

    status_label = trip.status.value if hasattr(trip.status, "value") else str(trip.status)
    event = "trip.updated"
    if "status" in data and data["status"] != old_status:
        event = f"trip.{status_label.lower()}"
    await notify_permission_holders(
        db,
        permission="trip.read",
        category="trip",
        event_type=event,
        title=f"Trip {trip.origin} → {trip.destination}",
        message=f"Trip status is now {status_label}.",
        entity_type="trip",
        entity_id=trip.id,
        exclude_user_id=current_user.id,
    )
    return SuccessResponse(message="Trip updated successfully", data=await _trip_response(db, trip))

@trips_router.delete("/{trip_id}", response_model=SuccessResponse)
async def delete_trip(
    trip_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("trip.cancel")),
):
    trip = await _get_or_404(db, Trip, trip_id)
    route = f"{trip.origin} → {trip.destination}"
    trip_id_copy = trip.id
    if trip.status == TripStatus.IN_PROGRESS:
        await _apply_status_side_effects(db, trip, TripStatus.IN_PROGRESS, TripStatus.CANCELLED)
    await _delete(db, trip)
    await notify_permission_holders(
        db,
        permission="trip.read",
        category="trip",
        event_type="trip.deleted",
        title=f"Trip {route} deleted",
        message="Trip was removed from the live board.",
        entity_type="trip",
        entity_id=trip_id_copy,
        exclude_user_id=current_user.id,
    )
    return SuccessResponse(message="Trip deleted successfully")


# ============================================================
# MAINTENANCE
# ============================================================
maintenance_router = APIRouter(prefix="/maintenance", tags=["Maintenance"])

async def _maintenance_response(db: AsyncSession, record: Maintenance) -> MaintenanceResponse:
    vehicle = await db.get(Vehicle, record.vehicle_id)
    return MaintenanceResponse(
        id=record.id,
        vehicle_id=record.vehicle_id,
        maintenance_type=record.maintenance_type or "General",
        description=record.description,
        scheduled_date=record.scheduled_date,
        cost=record.cost,
        status=record.status.value if hasattr(record.status, "value") else str(record.status),
        vehicle_reg=vehicle.license_plate if vehicle else None,
        vehicle_model=vehicle.model if vehicle else None,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )

async def _sync_vehicle_for_maintenance(
    db: AsyncSession,
    vehicle_id,
    *,
    putting_in_shop: bool,
):
    vehicle = await db.get(Vehicle, vehicle_id)
    if not vehicle:
        return
    # Never revive a retired vehicle
    if vehicle.status == VehicleStatus.INACTIVE:
        return
    if putting_in_shop:
        vehicle.status = VehicleStatus.MAINTENANCE
    else:
        # Only restore if currently In Shop
        if vehicle.status == VehicleStatus.MAINTENANCE:
            vehicle.status = VehicleStatus.ACTIVE
    db.add(vehicle)

@maintenance_router.get("", response_model=SuccessResponse[list[MaintenanceResponse]])
async def list_maintenance(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("maintenance.read")),
):
    query = select(Maintenance)
    if status and status != "ALL":
        query = query.where(Maintenance.status == status)
    result = await db.execute(
        query.offset(skip).limit(limit).order_by(Maintenance.scheduled_date.desc())
    )
    records = result.scalars().all()
    return SuccessResponse(
        message="Maintenance records retrieved successfully",
        data=[await _maintenance_response(db, r) for r in records],
    )

@maintenance_router.post("", response_model=SuccessResponse[MaintenanceResponse], status_code=201)
async def create_maintenance(
    body: MaintenanceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("maintenance.create")),
):
    await _get_or_404(db, Vehicle, body.vehicle_id)
    data = body.model_dump()
    data["status"] = MaintenanceStatus(data["status"])
    record = await _create(db, Maintenance, data)

    if record.status in {MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS}:
        await _sync_vehicle_for_maintenance(db, record.vehicle_id, putting_in_shop=True)
        await db.commit()
        await db.refresh(record)

    vehicle = await db.get(Vehicle, record.vehicle_id)
    plate = vehicle.license_plate if vehicle else "vehicle"
    await notify_permission_holders(
        db,
        permission="maintenance.read",
        category="maintenance",
        event_type="maintenance.created",
        title=f"Maintenance scheduled for {plate}",
        message=record.description[:200] or f"{record.maintenance_type} maintenance created.",
        entity_type="maintenance",
        entity_id=record.id,
        exclude_user_id=current_user.id,
    )
    return SuccessResponse(
        message="Maintenance record created successfully",
        data=await _maintenance_response(db, record),
    )

@maintenance_router.get("/{record_id}", response_model=SuccessResponse[MaintenanceResponse])
async def get_maintenance(
    record_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("maintenance.read")),
):
    record = await _get_or_404(db, Maintenance, record_id)
    return SuccessResponse(
        message="Maintenance record retrieved successfully",
        data=await _maintenance_response(db, record),
    )

@maintenance_router.patch("/{record_id}", response_model=SuccessResponse[MaintenanceResponse])
async def update_maintenance(
    record_id: UUID,
    body: MaintenanceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("maintenance.update")),
):
    record = await _get_or_404(db, Maintenance, record_id)
    old_status = record.status
    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] is not None:
        data["status"] = MaintenanceStatus(data["status"])
    record = await _update(db, record, data)

    new_status = record.status
    active_shop = {MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS}
    closed = {MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED}

    if new_status in active_shop:
        await _sync_vehicle_for_maintenance(db, record.vehicle_id, putting_in_shop=True)
        await db.commit()
        await db.refresh(record)
    elif old_status in active_shop and new_status in closed:
        # Restore Available only if no other open maintenance on this vehicle
        open_q = await db.execute(
            select(func.count())
            .select_from(Maintenance)
            .where(
                Maintenance.vehicle_id == record.vehicle_id,
                Maintenance.id != record.id,
                Maintenance.status.in_(list(active_shop)),
            )
        )
        other_open = open_q.scalar() or 0
        if other_open == 0:
            await _sync_vehicle_for_maintenance(db, record.vehicle_id, putting_in_shop=False)
            await db.commit()
            await db.refresh(record)

    vehicle = await db.get(Vehicle, record.vehicle_id)
    plate = vehicle.license_plate if vehicle else "vehicle"
    status_label = (
        record.status.value if hasattr(record.status, "value") else str(record.status)
    )
    await notify_permission_holders(
        db,
        permission="maintenance.read",
        category="maintenance",
        event_type="maintenance.updated",
        title=f"Maintenance updated for {plate}",
        message=f"Status is now {status_label}.",
        entity_type="maintenance",
        entity_id=record.id,
        exclude_user_id=current_user.id,
    )
    return SuccessResponse(
        message="Maintenance record updated successfully",
        data=await _maintenance_response(db, record),
    )

@maintenance_router.delete("/{record_id}", response_model=SuccessResponse)
async def delete_maintenance(
    record_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("maintenance.update")),
):
    record = await _get_or_404(db, Maintenance, record_id)
    vehicle_id = record.vehicle_id
    record_id_copy = record.id
    was_open = record.status in {
        MaintenanceStatus.SCHEDULED,
        MaintenanceStatus.IN_PROGRESS,
    }
    vehicle = await db.get(Vehicle, vehicle_id)
    plate = vehicle.license_plate if vehicle else "vehicle"
    await _delete(db, record)
    if was_open:
        open_q = await db.execute(
            select(func.count())
            .select_from(Maintenance)
            .where(
                Maintenance.vehicle_id == vehicle_id,
                Maintenance.status.in_(
                    [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS]
                ),
            )
        )
        if (open_q.scalar() or 0) == 0:
            await _sync_vehicle_for_maintenance(db, vehicle_id, putting_in_shop=False)
            await db.commit()
    await notify_permission_holders(
        db,
        permission="maintenance.read",
        category="maintenance",
        event_type="maintenance.deleted",
        title=f"Maintenance deleted for {plate}",
        message="A maintenance record was removed.",
        entity_type="maintenance",
        entity_id=record_id_copy,
        exclude_user_id=current_user.id,
    )
    return SuccessResponse(message="Maintenance record deleted successfully")


# ============================================================
# EXPENSES
# ============================================================
expenses_router = APIRouter(prefix="/expenses", tags=["Finance"])

async def _expense_response(db: AsyncSession, expense: Expense) -> ExpenseResponse:
    vehicle = await db.get(Vehicle, expense.vehicle_id) if expense.vehicle_id else None
    trip = await db.get(Trip, expense.trip_id) if expense.trip_id else None
    trip_label = None
    if trip:
        trip_label = f"{trip.origin} → {trip.destination}"
    return ExpenseResponse(
        id=expense.id,
        vehicle_id=expense.vehicle_id,
        trip_id=expense.trip_id,
        expense_type=expense.expense_type.value if hasattr(expense.expense_type, "value") else str(expense.expense_type),
        amount=float(expense.amount),
        date_incurred=expense.date_incurred,
        description=expense.description,
        vehicle_reg=vehicle.license_plate if vehicle else None,
        vehicle_model=vehicle.model if vehicle else None,
        trip_label=trip_label,
        created_at=expense.created_at,
        updated_at=expense.updated_at,
    )

@expenses_router.get("", response_model=SuccessResponse[list[ExpenseResponse]])
async def list_expenses(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("expense.read")),
):
    result = await db.execute(
        select(Expense).offset(skip).limit(limit).order_by(Expense.date_incurred.desc())
    )
    expenses = result.scalars().all()
    return SuccessResponse(
        message="Expenses retrieved successfully",
        data=[await _expense_response(db, e) for e in expenses],
    )

@expenses_router.post("", response_model=SuccessResponse[ExpenseResponse], status_code=201)
async def create_expense(
    body: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("expense.create")),
):
    data = body.model_dump()
    data["expense_type"] = ExpenseType(data["expense_type"])
    expense = await _create(db, Expense, data)
    etype = (
        expense.expense_type.value
        if hasattr(expense.expense_type, "value")
        else str(expense.expense_type)
    )
    await notify_permission_holders(
        db,
        permission="expense.read",
        category="expense",
        event_type="expense.created",
        title=f"Expense logged: {etype}",
        message=f"₹{float(expense.amount):,.2f} on {expense.date_incurred}.",
        entity_type="expense",
        entity_id=expense.id,
        exclude_user_id=current_user.id,
    )
    return SuccessResponse(
        message="Expense created successfully",
        data=await _expense_response(db, expense),
    )

@expenses_router.get("/{expense_id}", response_model=SuccessResponse[ExpenseResponse])
async def get_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("expense.read")),
):
    expense = await _get_or_404(db, Expense, expense_id)
    return SuccessResponse(
        message="Expense retrieved successfully",
        data=await _expense_response(db, expense),
    )

@expenses_router.delete("/{expense_id}", response_model=SuccessResponse)
async def delete_expense(
    expense_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("expense.create")),
):
    expense = await _get_or_404(db, Expense, expense_id)
    etype = (
        expense.expense_type.value
        if hasattr(expense.expense_type, "value")
        else str(expense.expense_type)
    )
    amount = float(expense.amount)
    expense_id_copy = expense.id
    await _delete(db, expense)
    await notify_permission_holders(
        db,
        permission="expense.read",
        category="expense",
        event_type="expense.deleted",
        title=f"Expense deleted: {etype}",
        message=f"₹{amount:,.2f} expense was removed.",
        entity_type="expense",
        entity_id=expense_id_copy,
        exclude_user_id=current_user.id,
    )
    return SuccessResponse(message="Expense deleted successfully")


# ============================================================
# FUEL LOGS
# ============================================================
fuel_router = APIRouter(prefix="/fuel-logs", tags=["Finance"])

async def _fuel_response(db: AsyncSession, log: FuelLog) -> FuelLogResponse:
    vehicle = await db.get(Vehicle, log.vehicle_id)
    return FuelLogResponse(
        id=log.id,
        vehicle_id=log.vehicle_id,
        liters=float(log.gallons),
        cost=float(log.cost),
        date_filled=log.date_filled,
        vehicle_reg=vehicle.license_plate if vehicle else None,
        vehicle_model=vehicle.model if vehicle else None,
        created_at=log.created_at,
        updated_at=log.updated_at,
    )

@fuel_router.get("", response_model=SuccessResponse[list[FuelLogResponse]])
async def list_fuel_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("fuel.read")),
):
    result = await db.execute(
        select(FuelLog).offset(skip).limit(limit).order_by(FuelLog.date_filled.desc())
    )
    logs = result.scalars().all()
    return SuccessResponse(
        message="Fuel logs retrieved successfully",
        data=[await _fuel_response(db, log) for log in logs],
    )

@fuel_router.post("", response_model=SuccessResponse[FuelLogResponse], status_code=201)
async def create_fuel_log(
    body: FuelLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("fuel.create")),
):
    await _get_or_404(db, Vehicle, body.vehicle_id)
    log = await _create(
        db,
        FuelLog,
        {
            "vehicle_id": body.vehicle_id,
            "gallons": body.liters,  # stored as gallons column; treated as liters in API
            "cost": body.cost,
            "date_filled": body.date_filled,
        },
    )
    vehicle = await db.get(Vehicle, log.vehicle_id)
    plate = vehicle.license_plate if vehicle else "vehicle"
    await notify_permission_holders(
        db,
        permission="fuel.read",
        category="fuel",
        event_type="fuel.created",
        title=f"Fuel log for {plate}",
        message=f"₹{float(log.cost):,.2f} · {float(log.gallons):.1f} L on {log.date_filled}.",
        entity_type="fuel",
        entity_id=log.id,
        exclude_user_id=current_user.id,
    )
    return SuccessResponse(
        message="Fuel log created successfully",
        data=await _fuel_response(db, log),
    )

@fuel_router.get("/{log_id}", response_model=SuccessResponse[FuelLogResponse])
async def get_fuel_log(
    log_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("fuel.read")),
):
    log = await _get_or_404(db, FuelLog, log_id)
    return SuccessResponse(
        message="Fuel log retrieved successfully",
        data=await _fuel_response(db, log),
    )

@fuel_router.delete("/{log_id}", response_model=SuccessResponse)
async def delete_fuel_log(
    log_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("fuel.create")),
):
    log = await _get_or_404(db, FuelLog, log_id)
    vehicle = await db.get(Vehicle, log.vehicle_id)
    plate = vehicle.license_plate if vehicle else "vehicle"
    cost = float(log.cost)
    log_id_copy = log.id
    await _delete(db, log)
    await notify_permission_holders(
        db,
        permission="fuel.read",
        category="fuel",
        event_type="fuel.deleted",
        title=f"Fuel log deleted for {plate}",
        message=f"₹{cost:,.2f} fuel entry was removed.",
        entity_type="fuel",
        entity_id=log_id_copy,
        exclude_user_id=current_user.id,
    )
    return SuccessResponse(message="Fuel log deleted successfully")


# ============================================================
# FINANCE SUMMARY
# ============================================================
finance_router = APIRouter(prefix="/finance", tags=["Finance"])

@finance_router.get("/ops-cost", response_model=SuccessResponse[OpsCostSummary])
async def get_ops_cost(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("fuel.read")),
):
    total_fuel = (await db.execute(
        select(func.coalesce(func.sum(FuelLog.cost), 0)).select_from(FuelLog)
    )).scalar() or 0.0
    total_maint = (await db.execute(
        select(func.coalesce(func.sum(Maintenance.cost), 0)).select_from(Maintenance)
    )).scalar() or 0.0
    total_toll = (await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0))
        .select_from(Expense)
        .where(Expense.expense_type == ExpenseType.TOLL)
    )).scalar() or 0.0
    total_other = (await db.execute(
        select(func.coalesce(func.sum(Expense.amount), 0))
        .select_from(Expense)
        .where(Expense.expense_type == ExpenseType.OTHER)
    )).scalar() or 0.0
    fuel = float(total_fuel)
    maint = float(total_maint)
    summary = OpsCostSummary(
        total_fuel_cost=fuel,
        total_maintenance_cost=maint,
        total_toll_cost=float(total_toll),
        total_other_cost=float(total_other),
        total_operational_cost=fuel + maint,
    )
    return SuccessResponse(message="Ops cost summary retrieved", data=summary)


# ============================================================
# DASHBOARD — Aggregated stats
# ============================================================
dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@dashboard_router.get("/stats", response_model=SuccessResponse[DashboardStats])
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("dashboard.view")),
):
    """Get aggregated dashboard statistics."""
    total_vehicles = (await db.execute(select(func.count()).select_from(Vehicle))).scalar() or 0
    active_vehicles = (await db.execute(
        select(func.count()).select_from(Vehicle).where(Vehicle.status == "ACTIVE")
    )).scalar() or 0

    total_drivers = (await db.execute(select(func.count()).select_from(Driver))).scalar() or 0
    active_drivers = (await db.execute(
        select(func.count()).select_from(Driver).where(
            Driver.status.in_(["AVAILABLE", "ACTIVE", "ON_TRIP"])
        )
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


@dashboard_router.get("/overview", response_model=SuccessResponse[DashboardOverview])
async def get_dashboard_overview(
    vehicle_type: str | None = Query(None),
    status: str | None = Query(None),
    region: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("dashboard.view")),
):
    """Role-aware live operational dashboard (KPIs + chart series)."""
    data = await build_dashboard_overview(
        db,
        current_user,
        vehicle_type=vehicle_type,
        status=status,
        region=region,
    )
    return SuccessResponse(message="Dashboard overview retrieved", data=data)


# ============================================================
# ANALYTICS — Deep analysis
# ============================================================
analytics_router = APIRouter(prefix="/analytics", tags=["Analytics"])


@analytics_router.get("/overview", response_model=SuccessResponse[AnalyticsOverview])
async def get_analytics_overview(
    vehicle_id: str | None = Query(None),
    vehicle_type: str | None = Query(None),
    region: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("dashboard.view")),
):
    """Role-aware analytics — trends and deeper cost/ops insights."""
    data = await build_analytics_overview(
        db,
        current_user,
        vehicle_id=vehicle_id,
        vehicle_type=vehicle_type,
        region=region,
        date_from=date_from,
        date_to=date_to,
    )
    return SuccessResponse(message="Analytics overview retrieved", data=data)


# ============================================================
# SETTINGS — Organization preferences
# ============================================================
settings_router = APIRouter(prefix="/settings", tags=["Settings"])


def _general_from_row(row: Setting | None) -> GeneralSettings:
    if not row or not isinstance(row.value, dict):
        return DEFAULT_GENERAL_SETTINGS.model_copy()
    return GeneralSettings(
        depot_name=str(row.value.get("depot_name") or DEFAULT_GENERAL_SETTINGS.depot_name),
        currency=str(row.value.get("currency") or DEFAULT_GENERAL_SETTINGS.currency),
        distance_unit=str(
            row.value.get("distance_unit") or DEFAULT_GENERAL_SETTINGS.distance_unit
        ),
    )


@settings_router.get("/general", response_model=SuccessResponse[GeneralSettings])
async def get_general_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("settings.manage")),
):
    result = await db.execute(
        select(Setting).where(Setting.key == GENERAL_SETTINGS_KEY)
    )
    row = result.scalar_one_or_none()
    return SuccessResponse(
        message="General settings retrieved",
        data=_general_from_row(row),
    )


@settings_router.put("/general", response_model=SuccessResponse[GeneralSettings])
async def update_general_settings(
    body: GeneralSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("settings.manage")),
):
    result = await db.execute(
        select(Setting).where(Setting.key == GENERAL_SETTINGS_KEY)
    )
    row = result.scalar_one_or_none()
    current = _general_from_row(row)
    updates = body.model_dump(exclude_unset=True)
    merged = current.model_copy(update=updates)

    if not merged.depot_name.strip():
        raise AppException(message="Depot name is required", status_code=400)

    payload = merged.model_dump()
    if row is None:
        row = Setting(
            key=GENERAL_SETTINGS_KEY,
            value=payload,
            description="Organization general preferences",
        )
        db.add(row)
    else:
        row.value = payload
        db.add(row)

    await db.commit()
    await db.refresh(row)
    return SuccessResponse(
        message="General settings saved",
        data=_general_from_row(row),
    )


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
router.include_router(finance_router)
router.include_router(dashboard_router)
router.include_router(analytics_router)
router.include_router(settings_router)
router.include_router(notifications_router)
