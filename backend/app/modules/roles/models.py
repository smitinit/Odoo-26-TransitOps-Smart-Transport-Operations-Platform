from uuid import UUID
from typing import List
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.shared.base.model import BaseModel

class Role(BaseModel):
    __tablename__ = "roles"
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)

class Permission(BaseModel):
    __tablename__ = "permissions"
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False) # e.g. "vehicle:create"
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)

class RolePermission(BaseModel):
    __tablename__ = "role_permissions"
    role_id: Mapped[UUID] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), index=True)
    permission_id: Mapped[UUID] = mapped_column(ForeignKey("permissions.id", ondelete="CASCADE"), index=True)
