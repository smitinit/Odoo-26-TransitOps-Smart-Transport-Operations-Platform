from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core import security
from app.database.session import get_db
from app.modules.users.models import User
from app.modules.roles.models import Role, Permission, RolePermission
from app.shared.exceptions import UnauthorizedException, ForbiddenException
from uuid import UUID

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_current_user(
    db: AsyncSession = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
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

    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise UnauthorizedException(message="User not found")
    if not user.is_active:
        raise UnauthorizedException(message="Inactive user")
    return user

async def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_superuser:
        raise ForbiddenException(message="The user doesn't have enough privileges")
    return current_user

def require_permission(required_permission: str):
    async def permission_dependency(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ) -> User:
        if current_user.is_superuser:
            return current_user

        if not current_user.role_id:
            raise ForbiddenException(message="User has no role assigned")

        # Query to check if the user's role has the specific permission
        query = (
            select(Permission)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .where(
                RolePermission.role_id == current_user.role_id,
                Permission.name == required_permission
            )
        )
        
        result = await db.execute(query)
        permission = result.scalar_one_or_none()
        
        if not permission:
            raise ForbiddenException(message=f"Missing required permission: {required_permission}")
            
        return current_user
        
    return permission_dependency
