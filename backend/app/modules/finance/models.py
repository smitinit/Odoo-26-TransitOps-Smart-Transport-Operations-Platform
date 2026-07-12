from uuid import UUID
from datetime import date
from sqlalchemy import String, ForeignKey, Enum, Float, Date
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.base.model import BaseModel
import enum

class ExpenseType(str, enum.Enum):
    FUEL = "FUEL"
    MAINTENANCE = "MAINTENANCE"
    TOLL = "TOLL"
    OTHER = "OTHER"

class Expense(BaseModel):
    __tablename__ = "expenses"

    vehicle_id: Mapped[UUID | None] = mapped_column(ForeignKey("vehicles.id", ondelete="SET NULL"), index=True, nullable=True)
    trip_id: Mapped[UUID | None] = mapped_column(ForeignKey("trips.id", ondelete="SET NULL"), index=True, nullable=True)
    expense_type: Mapped[ExpenseType] = mapped_column(Enum(ExpenseType), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    date_incurred: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)

class FuelLog(BaseModel):
    __tablename__ = "fuel_logs"

    vehicle_id: Mapped[UUID] = mapped_column(ForeignKey("vehicles.id", ondelete="CASCADE"), index=True)
    gallons: Mapped[float] = mapped_column(Float, nullable=False)
    cost: Mapped[float] = mapped_column(Float, nullable=False)
    date_filled: Mapped[date] = mapped_column(Date, nullable=False)
