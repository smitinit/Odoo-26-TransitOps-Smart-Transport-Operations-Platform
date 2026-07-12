from pydantic import BaseModel
from typing import Generic, TypeVar

T = TypeVar("T")

class PaginationParams(BaseModel):
    page: int = 1
    limit: int = 50
    search: str | None = None
    sort_by: str | None = None
    sort_desc: bool = False

class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    limit: int
    total_pages: int
