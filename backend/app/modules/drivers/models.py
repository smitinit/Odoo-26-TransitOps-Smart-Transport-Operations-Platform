from uuid import UUID
from datetime import date
from sqlalchemy import String, ForeignKey, Enum, Date, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.base.model import BaseModel, SoftDeleteMixin
import enum

class DriverStatus(str, enum.Enum):
    # Mockup statuses
    AVAILABLE = "AVAILABLE"
    ON_TRIP = "ON_TRIP"
    OFF_DUTY = "OFF_DUTY"
    SUSPENDED = "SUSPENDED"
    # Legacy values kept for existing rows
    ACTIVE = "ACTIVE"
    ON_LEAVE = "ON_LEAVE"
    TERMINATED = "TERMINATED"

class Driver(BaseModel, SoftDeleteMixin):
    __tablename__ = "drivers"

    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), unique=True, nullable=True
    )
    first_name: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    last_name: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    license_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    license_category: Mapped[str] = mapped_column(String(20), nullable=False, default="LMV")
    license_expiry: Mapped[date | None] = mapped_column(Date, nullable=True)
    contact_number: Mapped[str] = mapped_column(String(30), nullable=False, default="")
    safety_score: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    trip_completion_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[DriverStatus] = mapped_column(
        Enum(DriverStatus), default=DriverStatus.AVAILABLE
    )

class DriverDocument(BaseModel):
    __tablename__ = "driver_documents"
    
    driver_id: Mapped[UUID] = mapped_column(ForeignKey("drivers.id", ondelete="CASCADE"), index=True)
    document_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_url: Mapped[str] = mapped_column(String(255), nullable=False)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
