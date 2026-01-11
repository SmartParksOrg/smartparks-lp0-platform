from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.db.models import LogFile, User
from app.services.generate_log import GenerateLogParams, generate_jsonl
from app.services.scan import scan_jsonl_path
from app.services.scan_context import ScanContextCache
from app.storage.files import delete_file, save_generated, save_upload

router = APIRouter(prefix="/files", tags=["files"])

scan_cache = ScanContextCache(ttl_minutes=30)


class LogFileResponse(BaseModel):
    id: str
    original_filename: str
    size_bytes: int
    uploaded_at: datetime
    source_type: str
    metadata_json: dict[str, Any] | None


class ScanResponse(BaseModel):
    token: str
    expires_at: datetime
    summary: dict[str, Any]


class GenerateRequest(BaseModel):
    gateway_eui: str = "0102030405060708"
    devaddr: str = "26011BDA"
    frames: int = Field(default=100, ge=1, le=10000)
    interval_seconds: int = Field(default=10, ge=1, le=3600)
    start_time: datetime | None = None
    frequency_mhz: float = Field(default=868.3, ge=1.0)
    datarate: str = "SF7BW125"
    coding_rate: str = "4/5"
    payload_hex: str | None = None
    filename: str | None = None


def _get_logfile(db: Session, logfile_id: str, user: User) -> LogFile:
    query = db.query(LogFile).filter(LogFile.id == logfile_id)
    if user.role != "admin":
        query = query.filter(LogFile.owner_user_id == user.id)
    logfile = query.first()
    if not logfile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return logfile


@router.post(
    "/upload",
    response_model=LogFileResponse,
    dependencies=[Depends(require_roles(["editor", "admin"]))],
)
def upload_file(
    upload: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LogFileResponse:
    original_name, storage_path, size_bytes = save_upload(upload)

    logfile = LogFile(
        owner_user_id=current_user.id,
        original_filename=original_name,
        storage_path=storage_path,
        size_bytes=size_bytes,
        source_type="uploaded",
        metadata_json=None,
    )
    db.add(logfile)
    db.commit()
    db.refresh(logfile)
    return LogFileResponse(
        id=logfile.id,
        original_filename=logfile.original_filename,
        size_bytes=logfile.size_bytes,
        uploaded_at=logfile.uploaded_at,
        source_type=logfile.source_type,
        metadata_json=logfile.metadata_json,
    )


@router.post(
    "/generate",
    response_model=LogFileResponse,
    dependencies=[Depends(require_roles(["editor", "admin"]))],
)
def generate_file(
    payload: GenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LogFileResponse:
    start_time = payload.start_time or datetime.utcnow()
    try:
        params = GenerateLogParams(
            gateway_eui=payload.gateway_eui,
            devaddr=payload.devaddr,
            frames=payload.frames,
            interval_seconds=payload.interval_seconds,
            start_time=start_time,
            frequency_mhz=payload.frequency_mhz,
            datarate=payload.datarate,
            coding_rate=payload.coding_rate,
            payload_hex=payload.payload_hex,
        )
        lines = generate_jsonl(params)
        original_name, storage_path, size_bytes = save_generated(lines, payload.filename)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    logfile = LogFile(
        owner_user_id=current_user.id,
        original_filename=original_name,
        storage_path=storage_path,
        size_bytes=size_bytes,
        source_type="generated",
        metadata_json={
            "generator": {
                "gateway_eui": payload.gateway_eui,
                "devaddr": payload.devaddr,
                "frames": payload.frames,
                "interval_seconds": payload.interval_seconds,
                "start_time": start_time.isoformat(),
                "frequency_mhz": payload.frequency_mhz,
                "datarate": payload.datarate,
                "coding_rate": payload.coding_rate,
                "payload_hex": payload.payload_hex,
            }
        },
    )
    db.add(logfile)
    db.commit()
    db.refresh(logfile)
    return LogFileResponse(
        id=logfile.id,
        original_filename=logfile.original_filename,
        size_bytes=logfile.size_bytes,
        uploaded_at=logfile.uploaded_at,
        source_type=logfile.source_type,
        metadata_json=logfile.metadata_json,
    )


@router.get("", response_model=list[LogFileResponse])
def list_files(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[LogFileResponse]:
    query = db.query(LogFile)
    if current_user.role != "admin":
        query = query.filter(LogFile.owner_user_id == current_user.id)
    files = query.order_by(LogFile.uploaded_at.desc()).all()
    return [
        LogFileResponse(
            id=logfile.id,
            original_filename=logfile.original_filename,
            size_bytes=logfile.size_bytes,
            uploaded_at=logfile.uploaded_at,
            source_type=logfile.source_type,
            metadata_json=logfile.metadata_json,
        )
        for logfile in files
    ]


@router.get("/{logfile_id}", response_model=LogFileResponse)
def get_file(
    logfile_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LogFileResponse:
    logfile = _get_logfile(db, logfile_id, current_user)
    return LogFileResponse(
        id=logfile.id,
        original_filename=logfile.original_filename,
        size_bytes=logfile.size_bytes,
        uploaded_at=logfile.uploaded_at,
        source_type=logfile.source_type,
        metadata_json=logfile.metadata_json,
    )


@router.get("/{logfile_id}/preview")
def preview_file(
    logfile_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    logfile = _get_logfile(db, logfile_id, current_user)
    path = Path(logfile.storage_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing")

    max_bytes = 200 * 1024
    content = []
    total = 0
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            total += len(line.encode("utf-8"))
            if total > max_bytes:
                break
            content.append(line)

    truncated = total > max_bytes
    return {"content": "".join(content), "truncated": truncated}


@router.get("/{logfile_id}/download")
def download_file(
    logfile_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    logfile = _get_logfile(db, logfile_id, current_user)
    path = Path(logfile.storage_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing")

    return FileResponse(path, filename=logfile.original_filename)


@router.delete(
    "/{logfile_id}",
    dependencies=[Depends(require_roles(["editor", "admin"]))],
)
def delete_logfile(
    logfile_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    logfile = _get_logfile(db, logfile_id, current_user)
    delete_file(logfile.storage_path)
    db.delete(logfile)
    db.commit()
    return {"status": "deleted"}


@router.post(
    "/{logfile_id}/scan",
    response_model=ScanResponse,
    dependencies=[Depends(require_roles(["editor", "admin"]))],
)
def scan_file(
    logfile_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ScanResponse:
    logfile = _get_logfile(db, logfile_id, current_user)
    path = Path(logfile.storage_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing")

    summary = scan_jsonl_path(path)
    context = scan_cache.create(logfile_id, summary)
    return ScanResponse(token=context.token, expires_at=context.expires_at, summary=summary)
