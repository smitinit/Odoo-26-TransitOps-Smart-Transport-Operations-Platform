from typing import Generic, TypeVar, Type, Optional, Any, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from sqlalchemy.exc import SQLAlchemyError
from uuid import UUID

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")

class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    async def get_by_id(self, db: AsyncSession, id: UUID) -> Optional[ModelType]:
        result = await db.execute(select(self.model).where(self.model.id == id))
        return result.scalar_one_or_none()

    async def get_all(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> Sequence[ModelType]:
        result = await db.execute(select(self.model).offset(skip).limit(limit))
        return result.scalars().all()

    async def create(self, db: AsyncSession, *, obj_in: CreateSchemaType) -> ModelType:
        obj_in_data = obj_in.model_dump() if hasattr(obj_in, "model_dump") else obj_in
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(self, db: AsyncSession, *, db_obj: ModelType, obj_in: UpdateSchemaType | dict[str, Any]) -> ModelType:
        obj_data = db_obj.__dict__
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
            
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
                
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def delete(self, db: AsyncSession, *, id: UUID) -> ModelType:
        obj = await self.get_by_id(db, id)
        if obj:
            if hasattr(obj, 'deleted_at'):
                from datetime import datetime
                obj.deleted_at = datetime.utcnow()
                db.add(obj)
            else:
                await db.delete(obj)
            await db.commit()
        return obj

    async def exists(self, db: AsyncSession, id: UUID) -> bool:
        result = await db.execute(select(func.count()).where(self.model.id == id))
        return result.scalar() > 0

    async def paginate(self, db: AsyncSession, page: int = 1, limit: int = 50) -> tuple[Sequence[ModelType], int]:
        skip = (page - 1) * limit
        
        # Get total count
        count_query = select(func.count()).select_from(self.model)
        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0
        
        # Get items
        items_query = select(self.model).offset(skip).limit(limit)
        items_result = await db.execute(items_query)
        items = items_result.scalars().all()
        
        return items, total
