from uuid import UUID
from datetime import date
from decimal import Decimal
from sqlalchemy import String, ForeignKey, Enum, Date, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.base.model import BaseModel, SoftDeleteMixin
import enum

class VehicleStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"          # Available
    ON_TRIP = "ON_TRIP"        # On Trip
    MAINTENANCE = "MAINTENANCE"  # In Shop
    INACTIVE = "INACTIVE"      # Retired

class Vehicle(BaseModel, SoftDeleteMixin):
    __tablename__ = "vehicles"

    vin: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    license_plate: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    make: Mapped[str] = mapped_column(String(50), nullable=False)
    model: Mapped[str] = mapped_column(String(50), nullable=False)
    year: Mapped[int] = mapped_column(nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String(50), nullable=False, default="Van")
    capacity: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    odometer: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    acquisition_cost: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    status: Mapped[VehicleStatus] = mapped_column(Enum(VehicleStatus), default=VehicleStatus.ACTIVE)

class VehicleDocument(BaseModel):
    __tablename__ = "vehicle_documents"
    
    vehicle_id: Mapped[UUID] = mapped_column(ForeignKey("vehicles.id", ondelete="CASCADE"), index=True)
    document_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_url: Mapped[str] = mapped_column(String(255), nullable=False)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
