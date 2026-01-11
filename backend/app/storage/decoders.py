import os
from pathlib import Path
from typing import BinaryIO
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings


def _safe_original_name(filename: str | None) -> str:
    if not filename:
        return "decoder.js"
    return Path(filename).name


def _ensure_js(filename: str) -> None:
    if not filename.lower().endswith(".js"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .js decoder uploads are allowed",
        )


def _ensure_decoder_dir() -> Path:
    settings = get_settings()
    data_dir = Path(settings.data_dir)
    decoders_dir = data_dir / "decoders"
    decoders_dir.mkdir(parents=True, exist_ok=True)
    return decoders_dir


def _write_stream(handle: BinaryIO, target: Path, max_bytes: int) -> int:
    total = 0
    target_tmp = target.with_suffix(".tmp")
    with target_tmp.open("wb") as out:
        while True:
            chunk = handle.read(1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > max_bytes:
                out.close()
                target_tmp.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Upload exceeds size limit",
                )
            out.write(chunk)
    os.replace(target_tmp, target)
    return total


def save_decoder_upload(upload: UploadFile) -> tuple[str, str, int]:
    settings = get_settings()
    original_name = _safe_original_name(upload.filename)
    _ensure_js(original_name)

    decoders_dir = _ensure_decoder_dir()
    storage_name = f"{uuid4()}.js"
    storage_path = decoders_dir / storage_name

    size_bytes = _write_stream(upload.file, storage_path, settings.upload_max_bytes)
    return original_name, str(storage_path), size_bytes


def delete_decoder(path: str) -> None:
    file_path = Path(path)
    if file_path.exists():
        file_path.unlink()
