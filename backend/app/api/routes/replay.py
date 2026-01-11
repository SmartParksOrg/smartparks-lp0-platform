from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.api.routes.files import scan_cache
from app.db.models import LogFile, ReplayJob, User
from app.services.replay import ReplayRow, replay_jsonl_lines

router = APIRouter(prefix="/replay", tags=["replay"])


class ReplayRequest(BaseModel):
    scan_token: str | None = None
    file_id: str | None = None
    udp_host: str
    udp_port: int = Field(ge=1, le=65535)


class ReplayResponse(BaseModel):
    id: str
    status: str
    rows: list[dict[str, Any]]


def _get_logfile(db: Session, logfile_id: str, user: User) -> LogFile:
    query = db.query(LogFile).filter(LogFile.id == logfile_id)
    if user.role != "admin":
        query = query.filter(LogFile.owner_user_id == user.id)
    logfile = query.first()
    if not logfile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return logfile


def _serialize_rows(rows: list[ReplayRow]) -> list[dict[str, Any]]:
    return [
        {
            "status": row.status,
            "gateway_eui": row.gateway_eui,
            "frequency": row.frequency,
            "size": row.size,
            "message": row.message,
        }
        for row in rows
    ]


@router.post(
    "",
    response_model=ReplayResponse,
    dependencies=[Depends(require_roles(["editor", "admin"]))],
)
def replay_logs(
    payload: ReplayRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReplayResponse:
    if not payload.scan_token and not payload.file_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="scan_token or file_id is required",
        )

    logfile_id = payload.file_id
    if payload.scan_token:
        context = scan_cache.get(payload.scan_token)
        if not context:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan token expired")
        logfile_id = context.log_file_id

    if not logfile_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing logfile reference")

    logfile = _get_logfile(db, logfile_id, current_user)
    path = Path(logfile.storage_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File missing")

    with path.open("r", encoding="utf-8") as handle:
        rows = replay_jsonl_lines(handle, payload.udp_host, payload.udp_port)

    job = ReplayJob(
        log_file_id=logfile.id,
        udp_host=payload.udp_host,
        udp_port=payload.udp_port,
        status="completed",
        stats_json={"rows": _serialize_rows(rows)},
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    return ReplayResponse(id=job.id, status=job.status, rows=_serialize_rows(rows))


@router.get("/{job_id}", response_model=ReplayResponse)
def get_replay_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReplayResponse:
    job = db.query(ReplayJob).filter(ReplayJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Replay job not found")

    _ = _get_logfile(db, job.log_file_id, current_user)
    rows = job.stats_json.get("rows") if isinstance(job.stats_json, dict) else []
    return ReplayResponse(id=job.id, status=job.status, rows=rows)
