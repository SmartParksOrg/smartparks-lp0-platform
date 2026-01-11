from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.db.models import DeviceCredential, User

router = APIRouter(prefix="/devices", tags=["devices"])


def _normalize_hex(value: str) -> str:
    return value.replace(" ", "").replace(":", "").replace("-", "").strip().upper()


def _ensure_devaddr(value: str) -> str:
    cleaned = _normalize_hex(value)
    if len(cleaned) != 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="DevAddr must be 8 hex characters",
        )
    try:
        bytes.fromhex(cleaned)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="DevAddr must be hex",
        ) from exc
    return cleaned


def _ensure_key(value: str, label: str) -> str:
    cleaned = _normalize_hex(value)
    if len(cleaned) != 32:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label} must be 32 hex characters",
        )
    try:
        bytes.fromhex(cleaned)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{label} must be hex",
        ) from exc
    return cleaned


class DeviceCreateRequest(BaseModel):
    devaddr: str
    device_name: Optional[str] = None
    nwkskey: str
    appskey: str


class DeviceUpdateRequest(BaseModel):
    device_name: Optional[str] = None
    nwkskey: Optional[str] = None
    appskey: Optional[str] = None


class DeviceResponse(BaseModel):
    id: str
    devaddr: str
    device_name: Optional[str]
    nwkskey: str
    appskey: str


@router.get("", response_model=list[DeviceResponse])
def list_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DeviceResponse]:
    query = db.query(DeviceCredential)
    if current_user.role != "admin":
        query = query.filter(DeviceCredential.owner_user_id == current_user.id)
    devices = query.order_by(DeviceCredential.created_at.desc()).all()
    return [
        DeviceResponse(
            id=device.id,
            devaddr=device.devaddr,
            device_name=device.device_name,
            nwkskey=device.nwkskey,
            appskey=device.appskey,
        )
        for device in devices
    ]


@router.post(
    "",
    response_model=DeviceResponse,
    dependencies=[Depends(require_roles(["editor", "admin"]))],
)
def create_device(
    payload: DeviceCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DeviceResponse:
    devaddr = _ensure_devaddr(payload.devaddr)
    nwkskey = _ensure_key(payload.nwkskey, "NwkSKey")
    appskey = _ensure_key(payload.appskey, "AppSKey")

    device = DeviceCredential(
        owner_user_id=current_user.id,
        devaddr=devaddr,
        device_name=payload.device_name,
        nwkskey=nwkskey,
        appskey=appskey,
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return DeviceResponse(
        id=device.id,
        devaddr=device.devaddr,
        device_name=device.device_name,
        nwkskey=device.nwkskey,
        appskey=device.appskey,
    )


@router.patch(
    "/{device_id}",
    response_model=DeviceResponse,
    dependencies=[Depends(require_roles(["editor", "admin"]))],
)
def update_device(
    device_id: str,
    payload: DeviceUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DeviceResponse:
    query = db.query(DeviceCredential).filter(DeviceCredential.id == device_id)
    if current_user.role != "admin":
        query = query.filter(DeviceCredential.owner_user_id == current_user.id)
    device = query.first()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    if payload.device_name is not None:
        device.device_name = payload.device_name
    if payload.nwkskey is not None:
        device.nwkskey = _ensure_key(payload.nwkskey, "NwkSKey")
    if payload.appskey is not None:
        device.appskey = _ensure_key(payload.appskey, "AppSKey")

    db.commit()
    db.refresh(device)
    return DeviceResponse(
        id=device.id,
        devaddr=device.devaddr,
        device_name=device.device_name,
        nwkskey=device.nwkskey,
        appskey=device.appskey,
    )


@router.delete(
    "/{device_id}",
    dependencies=[Depends(require_roles(["editor", "admin"]))],
)
def delete_device(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    query = db.query(DeviceCredential).filter(DeviceCredential.id == device_id)
    if current_user.role != "admin":
        query = query.filter(DeviceCredential.owner_user_id == current_user.id)
    device = query.first()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

    db.delete(device)
    db.commit()
    return {"status": "deleted"}
