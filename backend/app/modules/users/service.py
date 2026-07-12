from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.base.service import BaseService
from app.shared.exceptions import AppException, status
from app.core.security import get_password_hash
from app.modules.users.models import User
from app.modules.users.schemas import UserCreate, UserUpdate
from app.modules.users.repository import UserRepository, user_repository

class UserService(BaseService[User, UserCreate, UserUpdate]):
    def __init__(self, repository: UserRepository):
        super().__init__(repository)
        self.repository = repository

    async def create_user(self, db: AsyncSession, *, obj_in: UserCreate) -> User:
        user_exists = await self.repository.get_by_email(db, email=obj_in.email)
        if user_exists:
            raise AppException(
                message="A user with this email already exists.",
                status_code=status.HTTP_409_CONFLICT
            )
            
        # Hash the password before saving
        db_obj = User(
            email=obj_in.email,
            first_name=obj_in.first_name,
            last_name=obj_in.last_name,
            is_active=obj_in.is_active,
            is_superuser=obj_in.is_superuser,
            role_id=obj_in.role_id,
            hashed_password=get_password_hash(obj_in.password)
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update_user(
        self, db: AsyncSession, *, user_id: UUID, obj_in: UserUpdate
    ) -> User:
        user = await self.repository.get_by_id(db, user_id)
        if not user or user.deleted_at is not None:
            raise AppException(
                message="User not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        update_data = obj_in.model_dump(exclude_unset=True)
        password = update_data.pop("password", None)
        if password is not None:
            update_data["hashed_password"] = get_password_hash(password)

        if "email" in update_data and update_data["email"] != user.email:
            existing = await self.repository.get_by_email(db, email=update_data["email"])
            if existing and existing.id != user.id:
                raise AppException(
                    message="A user with this email already exists.",
                    status_code=status.HTTP_409_CONFLICT,
                )

        return await self.repository.update(db, db_obj=user, obj_in=update_data)

user_service = UserService(user_repository)
