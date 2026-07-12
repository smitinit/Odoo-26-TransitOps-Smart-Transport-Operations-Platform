"""Create notifications for users who hold a given *.read permission."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notifications.broker import notification_broker
from app.modules.notifications.models import Notification
from app.modules.roles.models import Permission, RolePermission
from app.modules.users.models import User


def _serialize(notification: Notification) -> dict:
    return {
        "id": str(notification.id),
        "user_id": str(notification.user_id),
        "title": notification.title,
        "message": notification.message,
        "is_read": notification.is_read,
        "category": notification.category,
        "event_type": notification.event_type,
        "entity_type": notification.entity_type,
        "entity_id": str(notification.entity_id) if notification.entity_id else None,
        "permission_key": notification.permission_key,
        "created_at": notification.created_at.isoformat()
        if notification.created_at
        else None,
        "updated_at": notification.updated_at.isoformat()
        if notification.updated_at
        else None,
    }


async def _recipient_ids(
    db: AsyncSession,
    permission: str,
    exclude_user_id: UUID | None,
) -> list[UUID]:
    role_holders = (
        select(User.id)
        .join(RolePermission, RolePermission.role_id == User.role_id)
        .join(Permission, Permission.id == RolePermission.permission_id)
        .where(
            Permission.name == permission,
            User.is_active.is_(True),
            User.deleted_at.is_(None),
        )
    )
    superusers = select(User.id).where(
        User.is_superuser.is_(True),
        User.is_active.is_(True),
        User.deleted_at.is_(None),
    )
    query = select(User.id).where(
        or_(User.id.in_(role_holders), User.id.in_(superusers))
    )
    if exclude_user_id is not None:
        query = query.where(User.id != exclude_user_id)

    result = await db.execute(query)
    return list({row[0] for row in result.all()})


async def notify_permission_holders(
    db: AsyncSession,
    *,
    permission: str,
    category: str,
    event_type: str,
    title: str,
    message: str,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
    exclude_user_id: UUID | None = None,
) -> list[Notification]:
    recipient_ids = await _recipient_ids(db, permission, exclude_user_id)
    if not recipient_ids:
        return []

    notifications = [
        Notification(
            user_id=user_id,
            title=title[:100],
            message=message[:500],
            is_read=False,
            category=category,
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            permission_key=permission,
        )
        for user_id in recipient_ids
    ]
    db.add_all(notifications)
    await db.commit()
    for notification in notifications:
        await db.refresh(notification)

    for notification in notifications:
        await notification_broker.publish(
            notification.user_id, _serialize(notification)
        )

    return notifications
