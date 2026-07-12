from uuid import UUID
from datetime import date
from sqlalchemy import String, ForeignKey, Enum, Date, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.base.model import BaseModel
import enum

class MaintenanceStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"  # Ongoing
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class Maintenance(BaseModel):
    __tablename__ = "maintenance"

    vehicle_id: Mapped[UUID] = mapped_column(ForeignKey("vehicles.id", ondelete="CASCADE"), index=True)
    maintenance_type: Mapped[str] = mapped_column(String(100), nullable=False, default="General")
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False)
    cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[MaintenanceStatus] = mapped_column(
        Enum(MaintenanceStatus), default=MaintenanceStatus.SCHEDULED
    )
