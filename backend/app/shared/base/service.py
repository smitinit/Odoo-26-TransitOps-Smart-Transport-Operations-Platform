from typing import Generic, TypeVar, Optional, Sequence
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.shared.exceptions import NotFoundException
from app.shared.base.repository import BaseRepository

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")

class BaseService(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, repository: BaseRepository[ModelType, CreateSchemaType, UpdateSchemaType]):
        self.repository = repository

    async def get_by_id(self, db: AsyncSession, id: UUID) -> ModelType:
        obj = await self.repository.get_by_id(db, id)
        if not obj:
            raise NotFoundException(message=f"{self.repository.model.__name__} not found")
        return obj

    async def get_all(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> Sequence[ModelType]:
        return await self.repository.get_all(db, skip=skip, limit=limit)

    async def create(self, db: AsyncSession, *, obj_in: CreateSchemaType) -> ModelType:
        return await self.repository.create(db, obj_in=obj_in)

    async def update(self, db: AsyncSession, *, id: UUID, obj_in: UpdateSchemaType) -> ModelType:
        db_obj = await self.get_by_id(db, id)
        return await self.repository.update(db, db_obj=db_obj, obj_in=obj_in)

    async def delete(self, db: AsyncSession, *, id: UUID) -> ModelType:
        # get_by_id handles not found exception
        await self.get_by_id(db, id)
        return await self.repository.delete(db, id=id)
        
    async def get_paginated(self, db: AsyncSession, page: int = 1, limit: int = 50):
        items, total = await self.repository.paginate(db, page, limit)
        total_pages = (total + limit - 1) // limit
        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": total_pages
        }
