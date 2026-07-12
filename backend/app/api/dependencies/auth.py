from uuid import UUID

import jwt
from fastapi import Depends, Query
from fastapi.security import OAuth2PasswordBearer
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.database.session import get_db
from app.modules.roles.models import Permission, RolePermission
from app.modules.users.models import User
from app.shared.exceptions import ForbiddenException, UnauthorizedException

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")
oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False
)


async def _user_from_token(db: AsyncSession, token: str) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        token_data = payload.get("sub")
        if token_data is None:
            raise UnauthorizedException(message="Could not validate credentials")
    except (jwt.PyJWTError, ValidationError):
        raise UnauthorizedException(message="Could not validate credentials")

    try:
        user_id = UUID(token_data)
    except ValueError:
        raise UnauthorizedException(message="Invalid token format")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise UnauthorizedException(message="User not found")
    if not user.is_active:
        raise UnauthorizedException(message="Inactive user")
    return user


async def get_current_user(
    db: AsyncSession = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    return await _user_from_token(db, token)


async def get_current_user_sse(
    db: AsyncSession = Depends(get_db),
    token: str | None = Depends(oauth2_scheme_optional),
    access_token: str | None = Query(None),
) -> User:
    """Auth for SSE: Bearer header or ?access_token= (EventSource cannot set headers)."""
    resolved = token or access_token
    if not resolved:
        raise UnauthorizedException(message="Could not validate credentials")
    return await _user_from_token(db, resolved)


async def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_superuser:
        raise ForbiddenException(message="The user doesn't have enough privileges")
    return current_user


async def user_has_permission(
    db: AsyncSession, user: User, required_permission: str
) -> bool:
    if user.is_superuser:
        return True
    if not user.role_id:
        return False
    query = (
        select(Permission)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .where(
            RolePermission.role_id == user.role_id,
            Permission.name == required_permission,
        )
    )
    result = await db.execute(query)
    return result.scalar_one_or_none() is not None


def require_permission(required_permission: str):
    async def permission_dependency(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        if not await user_has_permission(db, current_user, required_permission):
            raise ForbiddenException(
                message=f"Missing required permission: {required_permission}"
            )
        return current_user

    return permission_dependency
