from uuid import UUID
from datetime import datetime
from sqlalchemy import String, ForeignKey, Enum, DateTime, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.base.model import BaseModel
import enum

class TripStatus(str, enum.Enum):
    PLANNED = "PLANNED"          # Created / Scheduled
    IN_PROGRESS = "IN_PROGRESS"  # In Transit
    COMPLETED = "COMPLETED"      # Delivered
    CANCELLED = "CANCELLED"

class Trip(BaseModel):
    __tablename__ = "trips"

    vehicle_id: Mapped[UUID] = mapped_column(ForeignKey("vehicles.id", ondelete="RESTRICT"), index=True)
    driver_id: Mapped[UUID] = mapped_column(ForeignKey("drivers.id", ondelete="RESTRICT"), index=True)
    origin: Mapped[str] = mapped_column(String(255), nullable=False)
    destination: Mapped[str] = mapped_column(String(255), nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    load_type: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    cargo_weight_kg: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    planned_distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[TripStatus] = mapped_column(Enum(TripStatus), default=TripStatus.PLANNED)
