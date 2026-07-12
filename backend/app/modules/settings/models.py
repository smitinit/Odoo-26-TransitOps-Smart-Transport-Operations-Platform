from sqlalchemy import String, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.base.model import BaseModel

class Setting(BaseModel):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
