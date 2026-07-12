from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
import jwt
from pydantic import ValidationError

from app.database.session import get_db
from app.shared.responses import SuccessResponse
from app.shared.exceptions import UnauthorizedException
from app.core.config import settings
from app.modules.auth.schemas import TokenSchema, RefreshTokenSchema
from app.modules.auth.service import auth_service
from app.core.security import create_access_token, create_refresh_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=TokenSchema)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    OAuth2 compatible token login, get an access token for future requests.
    Use this for Swagger UI authentication.
    """
    return await auth_service.authenticate(db, email=form_data.username, password=form_data.password)

@router.post("/refresh", response_model=TokenSchema)
async def refresh_token(
    data: RefreshTokenSchema,
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh access token
    """
    try:
        payload = jwt.decode(data.refresh_token, settings.SECRET_KEY, algorithms=["HS256"])
        token_type = payload.get("type")
        if token_type != "refresh":
             raise UnauthorizedException(message="Invalid token type")
        
        user_id = payload.get("sub")
        if not user_id:
            raise UnauthorizedException(message="Invalid token payload")
            
        # In a real app, you might also want to verify the user still exists and is active
        # For simplicity, we just generate new tokens based on the valid refresh token
        access_token = create_access_token(subject=user_id)
        refresh_token = create_refresh_token(subject=user_id)
        
        return TokenSchema(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer"
        )
    except (jwt.PyJWTError, ValidationError):
        raise UnauthorizedException(message="Could not validate credentials")

@router.post("/logout", response_model=SuccessResponse[dict])
async def logout():
    """
    Stateless logout. Client should delete their tokens.
    """
    return SuccessResponse(message="Successfully logged out")
