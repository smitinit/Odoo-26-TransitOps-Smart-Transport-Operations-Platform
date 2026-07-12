from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.users.service import user_service
from app.core.security import verify_password, create_access_token, create_refresh_token
from app.shared.exceptions import UnauthorizedException
from app.modules.auth.schemas import TokenSchema

class AuthService:
    async def authenticate(self, db: AsyncSession, email: str, password: str) -> TokenSchema:
        user = await user_service.repository.get_by_email(db, email=email)
        if not user or not verify_password(password, user.hashed_password):
            raise UnauthorizedException(message="Incorrect email or password")
        
        if not user.is_active:
            raise UnauthorizedException(message="Inactive user")

        access_token = create_access_token(subject=user.id)
        refresh_token = create_refresh_token(subject=user.id)
        
        return TokenSchema(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer"
        )
        
auth_service = AuthService()
