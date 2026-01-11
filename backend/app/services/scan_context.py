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
    def __init__(self, ttl_minutes: int = 30) -> None:
        self._ttl = timedelta(minutes=ttl_minutes)
        self._items: dict[str, ScanContext] = {}
        self._lock = Lock()

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
            self._items[context.token] = context
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
