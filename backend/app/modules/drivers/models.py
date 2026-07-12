from uuid import UUID
from datetime import date
from sqlalchemy import String, ForeignKey, Enum, Date
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.base.model import BaseModel, SoftDeleteMixin
import enum

class DriverStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    ON_LEAVE = "ON_LEAVE"
    TERMINATED = "TERMINATED"

class Driver(BaseModel, SoftDeleteMixin):
    __tablename__ = "drivers"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    license_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    status: Mapped[DriverStatus] = mapped_column(Enum(DriverStatus), default=DriverStatus.ACTIVE)

class DriverDocument(BaseModel):
    __tablename__ = "driver_documents"
    
    driver_id: Mapped[UUID] = mapped_column(ForeignKey("drivers.id", ondelete="CASCADE"), index=True)
    document_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_url: Mapped[str] = mapped_column(String(255), nullable=False)
    expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
