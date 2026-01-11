from typing import Literal

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.core.security import hash_password
from app.db.models import AuditEvent, User
from app.services.audit import record_audit_event

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_roles(["admin"]))])


class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    is_active: bool
    created_at: str
    updated_at: str


class AuditEventResponse(BaseModel):
    id: str
    user_id: str | None
    user_email: str | None
    action: str
    detail: str | None
    payload_json: dict[str, object] | None
    created_at: str


class CreateUserRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)
    role: Literal["admin", "editor", "viewer"] = "viewer"
    is_active: bool = True


class UpdateUserRequest(BaseModel):
    role: Literal["admin", "editor", "viewer"] | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8)


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
        updated_at=user.updated_at.isoformat(),
    )


@router.get("/users", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db)) -> list[UserResponse]:
    users = db.query(User).order_by(User.created_at.asc()).all()
    return [_user_response(user) for user in users]


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: CreateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    email = payload.email.lower().strip()
    if "@" not in email or email.startswith("@") or email.endswith("@"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email")
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already exists")

    user = User(
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=payload.is_active,
    )
    db.add(user)
    record_audit_event(
        db,
        user=current_user,
        action="admin.user.create",
        payload={"email": email, "role": payload.role, "is_active": payload.is_active},
    )
    db.commit()
    db.refresh(user)
    return _user_response(user)


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    payload: UpdateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == current_user.id:
        if payload.is_active is False:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate yourself")
        if payload.role and payload.role != "admin":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot demote yourself")

    if payload.role is not None:
        user.role = payload.role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.password:
        user.password_hash = hash_password(payload.password)

    record_audit_event(
        db,
        user=current_user,
        action="admin.user.update",
        payload={
            "user_id": user.id,
            "role": payload.role,
            "is_active": payload.is_active,
            "password_reset": bool(payload.password),
        },
    )
    db.commit()
    db.refresh(user)
    return _user_response(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete yourself")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    db.delete(user)
    record_audit_event(
        db,
        user=current_user,
        action="admin.user.delete",
        payload={"user_id": user.id, "email": user.email},
    )
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/audit", response_model=list[AuditEventResponse])
def list_audit(
    action: str | None = None,
    user_id: str | None = None,
    since: datetime | None = Query(default=None),
    until: datetime | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    db: Session = Depends(get_db),
) -> list[AuditEventResponse]:
    query = db.query(AuditEvent, User).outerjoin(User, AuditEvent.user_id == User.id)
    if action:
        query = query.filter(AuditEvent.action == action)
    if user_id:
        query = query.filter(AuditEvent.user_id == user_id)
    if since:
        query = query.filter(AuditEvent.created_at >= since)
    if until:
        query = query.filter(AuditEvent.created_at <= until)

    events = query.order_by(AuditEvent.created_at.desc()).limit(limit).all()
    return [
        AuditEventResponse(
            id=event.id,
            user_id=event.user_id,
            user_email=user.email if user else None,
            action=event.action,
            detail=event.detail,
            payload_json=event.payload_json,
            created_at=event.created_at.isoformat(),
        )
        for event, user in events
    ]
