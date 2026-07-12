from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.shared.responses import SuccessResponse
from app.modules.users.models import User
from app.modules.users.schemas import CurrentUserResponse
from app.modules.roles.models import Role, Permission, RolePermission
from app.api.dependencies.auth import get_current_user
from app.database.session import get_db

router = APIRouter(prefix="/users", tags=["Users"])


async def _load_role_and_permissions(db: AsyncSession, user: User) -> tuple[str | None, list[str]]:
    if user.is_superuser:
        result = await db.execute(select(Permission.name))
        permissions = sorted({row[0] for row in result.all()})
        role_name = "Admin"
        if user.role_id:
            role = await db.get(Role, user.role_id)
            if role:
                role_name = role.name
        return role_name, permissions

    if not user.role_id:
        return None, []

    role = await db.get(Role, user.role_id)
    role_name = role.name if role else None

    result = await db.execute(
        select(Permission.name)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .where(RolePermission.role_id == user.role_id)
    )
    permissions = sorted({row[0] for row in result.all()})
    return role_name, permissions


@router.get("/me", response_model=SuccessResponse[CurrentUserResponse])
async def read_current_user(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get current logged in user with role and permissions."""
    role_name, permissions = await _load_role_and_permissions(db, current_user)
    payload = CurrentUserResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        role_id=current_user.role_id,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        role_name=role_name,
        permissions=permissions,
    )
    return SuccessResponse(message="Current user retrieved successfully", data=payload)
