from dataclasses import dataclass
from datetime import datetime, timedelta
from secrets import token_urlsafe
from threading import Lock
from typing import Any


@dataclass(frozen=True)
class ScanContext:
    token: str
    log_file_id: str
    summary: dict[str, Any]
    created_at: datetime
    expires_at: datetime


class ScanContextCache:
    def __init__(self, ttl_minutes: int = 30, max_items: int = 200) -> None:
        self._ttl = timedelta(minutes=ttl_minutes)
        self._max_items = max(1, max_items)
        self._items: dict[str, ScanContext] = {}
        self._lock = Lock()

    def _prune_expired(self, now: datetime) -> None:
        expired = [token for token, ctx in self._items.items() if ctx.expires_at <= now]
        for token in expired:
            self._items.pop(token, None)

    def _enforce_max(self) -> None:
        if len(self._items) <= self._max_items:
            return
        overflow = len(self._items) - self._max_items
        oldest = sorted(self._items.items(), key=lambda item: item[1].created_at)[:overflow]
        for token, _ in oldest:
            self._items.pop(token, None)

    def create(self, log_file_id: str, summary: dict[str, Any]) -> ScanContext:
        now = datetime.utcnow()
        context = ScanContext(
            token=token_urlsafe(32),
            log_file_id=log_file_id,
            summary=summary,
            created_at=now,
            expires_at=now + self._ttl,
        )
        with self._lock:
            self._prune_expired(now)
            self._items[context.token] = context
            self._enforce_max()
        return context

    def get(self, token: str) -> ScanContext | None:
        with self._lock:
            context = self._items.get(token)
            if not context:
                return None
            if context.expires_at <= datetime.utcnow():
                self._items.pop(token, None)
                return None
            return context
