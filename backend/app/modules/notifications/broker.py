"""In-process SSE broker for notification fan-out.

Single uvicorn worker only — multi-worker needs Redis pub/sub.
"""

from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any
from uuid import UUID


class NotificationBroker:
    def __init__(self) -> None:
        self._subscribers: dict[UUID, set[asyncio.Queue[dict[str, Any]]]] = defaultdict(
            set
        )
        self._lock = asyncio.Lock()

    async def subscribe(self, user_id: UUID) -> asyncio.Queue[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=100)
        async with self._lock:
            self._subscribers[user_id].add(queue)
        return queue

    async def unsubscribe(
        self, user_id: UUID, queue: asyncio.Queue[dict[str, Any]]
    ) -> None:
        async with self._lock:
            subscribers = self._subscribers.get(user_id)
            if not subscribers:
                return
            subscribers.discard(queue)
            if not subscribers:
                self._subscribers.pop(user_id, None)

    async def publish(self, user_id: UUID, payload: dict[str, Any]) -> None:
        async with self._lock:
            queues = list(self._subscribers.get(user_id, set()))
        for queue in queues:
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
                try:
                    queue.put_nowait(payload)
                except asyncio.QueueFull:
                    pass


notification_broker = NotificationBroker()
