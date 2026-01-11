from typing import Any

from app.db.models import AuditEvent, User


def record_audit_event(
    db,
    user: User | None,
    action: str,
    payload: dict[str, Any] | None = None,
    detail: str | None = None,
) -> None:
    event = AuditEvent(
        user_id=user.id if user else None,
        action=action,
        payload_json=payload,
        detail=detail,
    )
    db.add(event)
