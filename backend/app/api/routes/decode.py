import csv
import json
from datetime import datetime
from io import StringIO
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.api.routes.files import scan_cache
from app.db.models import DeviceCredential, LogFile, User, UserDecoder
from app.services.decode import DecodeCache, DecodeRow, _load_decoder_source, decode_jsonl_lines

router = APIRouter(prefix="/decode", tags=["decode"])

_decode_cache = DecodeCache(ttl_minutes=30)


class DecodeRequest(BaseModel):
    scan_token: str | None = None
    file_id: str | None = None
    decoder_id: str | None = None
    devaddrs: list[str] | None = None


class DecodeResponse(BaseModel):
    token: str
    expires_at: datetime
    rows: list[dict[str, Any]]


def _normalize_hex(value: str) -> str:
    return value.replace(" ", "").replace(":", "").replace("-", "").strip().upper()


def _get_logfile(db: Session, logfile_id: str, user: User) -> LogFile:
    query = db.query(LogFile).filter(LogFile.id == logfile_id)
    if user.role != "admin":
        query = query.filter(LogFile.owner_user_id == user.id)
    logfile = query.first()
    if not logfile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return logfile


def _load_decoder(db: Session, decoder_id: str, user: User) -> str | None:
    if not decoder_id:
        return None
    if decoder_id == "raw":
        return None

    if decoder_id.startswith("builtin:"):
        return _load_decoder_source(decoder_id, None)

    query = db.query(UserDecoder).filter(UserDecoder.id == decoder_id)
    if user.role != "admin":
        query = query.filter(UserDecoder.owner_user_id == user.id)
    decoder = query.first()
    if not decoder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decoder not found")
    return _load_decoder_source(decoder_id, decoder)


def _load_credentials(db: Session, user: User) -> dict[str, DeviceCredential]:
    query = db.query(DeviceCredential)
    if user.role != "admin":
        query = query.filter(DeviceCredential.owner_user_id == user.id)
    creds = query.all()
    return {cred.devaddr.upper(): cred for cred in creds}


def _serialize_rows(rows: list[DecodeRow]) -> list[dict[str, Any]]:
    return [
        {
            "status": row.status,
            "devaddr": row.devaddr,
            "fcnt": row.fcnt,
            "fport": row.fport,
            "time": row.time,
            "payload_hex": row.payload_hex,
            "decoded_json": row.decoded_json,
            "error": row.error,
        }
        for row in rows
    ]


@router.post(
    "",
    response_model=DecodeResponse,
    dependencies=[Depends(require_roles(["editor", "admin"]))],
)
def decode_logs(
    payload: DecodeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DecodeResponse:
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

    decoder_source = _load_decoder(db, payload.decoder_id or "raw", current_user)
    credentials = _load_credentials(db, current_user)

    allowed_devaddrs = None
    if payload.devaddrs:
        allowed_devaddrs = {_normalize_hex(item) for item in payload.devaddrs if item.strip()}

    with path.open("r", encoding="utf-8") as handle:
        rows = decode_jsonl_lines(handle, credentials, decoder_source, allowed_devaddrs)

    result = _decode_cache.create(rows)
    return DecodeResponse(token=result.token, expires_at=result.expires_at, rows=_serialize_rows(rows))


@router.get("/{token}/export/json")
def export_json(
    token: str,
    _user: User = Depends(get_current_user),
) -> Response:
    result = _decode_cache.get(token)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decode token expired")

    payload = _serialize_rows(result.rows)
    return Response(content=json.dumps(payload), media_type="application/json")


@router.get("/{token}/export/csv")
def export_csv(
    token: str,
    _user: User = Depends(get_current_user),
) -> Response:
    result = _decode_cache.get(token)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decode token expired")

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "status",
        "devaddr",
        "fcnt",
        "fport",
        "time",
        "payload_hex",
        "decoded_json",
        "error",
    ])

    for row in result.rows:
        writer.writerow([
            row.status,
            row.devaddr,
            row.fcnt,
            row.fport,
            row.time,
            row.payload_hex,
            json.dumps(row.decoded_json) if row.decoded_json is not None else None,
            row.error,
        ])

    return Response(content=output.getvalue(), media_type="text/csv")
