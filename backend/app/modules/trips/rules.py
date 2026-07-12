"""Trip dispatch helpers: capacity parsing and assignment rules."""
from __future__ import annotations

import re
from datetime import date

from app.modules.drivers.models import Driver, DriverStatus
from app.modules.fleet.models import Vehicle, VehicleStatus
from app.shared.exceptions import AppException


def capacity_to_kg(capacity: str | None) -> float:
    if not capacity:
        return 0.0
    match = re.match(r"^\s*([\d.]+)\s*(kg|kgs|ton|tons|t)?\s*$", capacity.strip(), re.I)
    if not match:
        return 0.0
    value = float(match.group(1))
    unit = (match.group(2) or "kg").lower()
    if unit in {"ton", "tons", "t"}:
        return value * 1000.0
    return value


def assert_vehicle_dispatchable(vehicle: Vehicle) -> None:
    blocked = {
        VehicleStatus.INACTIVE,
        VehicleStatus.MAINTENANCE,
        VehicleStatus.ON_TRIP,
    }
    if vehicle.status in blocked or (
        hasattr(vehicle.status, "value") and vehicle.status.value in {"INACTIVE", "MAINTENANCE", "ON_TRIP"}
    ):
        raise AppException(
            message=f"Vehicle {vehicle.license_plate} is not available for dispatch (status={vehicle.status}).",
            status_code=400,
        )


def assert_driver_dispatchable(driver: Driver) -> None:
    status = driver.status.value if hasattr(driver.status, "value") else str(driver.status)
    if status in {"SUSPENDED", "TERMINATED", "ON_TRIP"}:
        raise AppException(
            message=f"Driver {driver.first_name} {driver.last_name} cannot be assigned (status={status}).",
            status_code=400,
        )
    if driver.license_expiry and driver.license_expiry < date.today():
        raise AppException(
            message=f"Driver {driver.first_name} {driver.last_name} has an expired license.",
            status_code=400,
        )
    if status not in {"AVAILABLE", "ACTIVE", "OFF_DUTY", "ON_LEAVE"}:
        # OFF_DUTY can be selected but warn via allow — brief says Available only.
        # Strict: only AVAILABLE/ACTIVE
        if status not in {"AVAILABLE", "ACTIVE"}:
            raise AppException(
                message=f"Driver {driver.first_name} {driver.last_name} is not available for dispatch.",
                status_code=400,
            )


def assert_cargo_fits(vehicle: Vehicle, cargo_weight_kg: float) -> None:
    capacity_kg = capacity_to_kg(vehicle.capacity)
    if capacity_kg > 0 and cargo_weight_kg > capacity_kg:
        raise AppException(
            message=(
                f"Cargo weight ({cargo_weight_kg:g} kg) exceeds vehicle capacity "
                f"({vehicle.capacity} ≈ {capacity_kg:g} kg). Select a higher-capacity vehicle."
            ),
            status_code=400,
        )
