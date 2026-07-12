from uuid import UUID
from sqlalchemy import String, ForeignKey, Boolean, Index
from sqlalchemy.orm import Mapped, mapped_column
from app.shared.base.model import BaseModel


class Notification(BaseModel):
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_user_id_is_read", "user_id", "is_read"),
        Index("ix_notifications_user_id_created_at", "user_id", "created_at"),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, default="system")
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    entity_id: Mapped[UUID | None] = mapped_column(nullable=True)
    permission_key: Mapped[str | None] = mapped_column(String(100), nullable=True)
