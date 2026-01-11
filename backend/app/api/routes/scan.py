from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.api.routes.files import scan_cache

router = APIRouter(prefix="/scan", tags=["scan"])


class ScanContextResponse(BaseModel):
    token: str
    log_file_id: str
    summary: dict[str, Any]
    created_at: datetime
    expires_at: datetime


@router.get("/{token}", response_model=ScanContextResponse)
def get_scan_context(token: str, _user=Depends(get_current_user)) -> ScanContextResponse:
    context = scan_cache.get(token)
    if not context:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan token expired or missing")

    return ScanContextResponse(
        token=context.token,
        log_file_id=context.log_file_id,
        summary=context.summary,
        created_at=context.created_at,
        expires_at=context.expires_at,
    )
