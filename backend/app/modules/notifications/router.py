"""Notifications REST + SSE streaming endpoints."""

from __future__ import annotations

import asyncio
import json
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.auth import (
    get_current_user_sse,
    require_permission,
    user_has_permission,
)
from app.api.v1.schemas import NotificationResponse, UnreadCountResponse
from app.database.session import get_db
from app.modules.notifications.broker import notification_broker
from app.modules.notifications.models import Notification
from app.modules.users.models import User
from app.shared.exceptions import ForbiddenException, NotFoundException
from app.shared.responses import SuccessResponse

notifications_router = APIRouter(prefix="/notifications", tags=["Notifications"])


@notifications_router.get(
    "", response_model=SuccessResponse[list[NotificationResponse]]
)
async def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    unread_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("notification.read")),
):
    query = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        query = query.where(Notification.is_read.is_(False))
    query = (
        query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
    )
    result = await db.execute(query)
    rows = result.scalars().all()
    return SuccessResponse(message="Notifications retrieved", data=rows)


@notifications_router.get(
    "/unread-count", response_model=SuccessResponse[UnreadCountResponse]
)
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("notification.read")),
):
    result = await db.execute(
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
    )
    count = int(result.scalar() or 0)
    return SuccessResponse(
        message="Unread count retrieved",
        data=UnreadCountResponse(count=count),
    )


@notifications_router.patch(
    "/{notification_id}/read",
    response_model=SuccessResponse[NotificationResponse],
)
async def mark_notification_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("notification.read")),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise NotFoundException(message="Notification not found")
    row.is_read = True
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return SuccessResponse(message="Notification marked as read", data=row)


@notifications_router.post(
    "/read-all", response_model=SuccessResponse[UnreadCountResponse]
)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("notification.read")),
):
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
        .values(is_read=True)
    )
    await db.commit()
    return SuccessResponse(
        message="All notifications marked as read",
        data=UnreadCountResponse(count=0),
    )


@notifications_router.get("/stream")
async def stream_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user_sse),
):
    if not await user_has_permission(db, current_user, "notification.read"):
        raise ForbiddenException(message="Missing required permission: notification.read")

    unread_result = await db.execute(
        select(func.count())
        .select_from(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
    )
    unread = int(unread_result.scalar() or 0)
    user_id = current_user.id

    async def event_generator():
        queue = await notification_broker.subscribe(user_id)
        try:
            yield f"event: connected\ndata: {json.dumps({'unread_count': unread})}\n\n"
            while True:
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"event: notification\ndata: {json.dumps(payload)}\n\n"
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
        finally:
            await notification_broker.unsubscribe(user_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
