from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db, require_roles
from app.db.models import User, UserDecoder
from app.storage.decoders import delete_decoder, save_decoder_upload

router = APIRouter(prefix="/decoders", tags=["decoders"])


class DecoderResponse(BaseModel):
    id: str
    name: str
    kind: str
    size_bytes: int
    uploaded_at: str | None


class UploadResponse(BaseModel):
    id: str
    name: str
    size_bytes: int


def _builtin_dir() -> Path:
    repo_root = Path(__file__).resolve().parents[4]
    return repo_root / "decoders"


def _builtin_decoders() -> list[DecoderResponse]:
    results: list[DecoderResponse] = []
    directory = _builtin_dir()
    if not directory.exists():
        return results

    for entry in sorted(directory.glob("*.js")):
        if entry.is_file():
            results.append(
                DecoderResponse(
                    id=f"builtin:{entry.name}",
                    name=entry.name,
                    kind="builtin",
                    size_bytes=entry.stat().st_size,
                    uploaded_at=None,
                )
            )
    return results


def _get_builtin_path(decoder_id: str) -> Path:
    name = decoder_id.replace("builtin:", "", 1)
    path = _builtin_dir() / name
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decoder not found")
    return path


def _get_user_decoder(db: Session, decoder_id: str, user: User) -> UserDecoder:
    query = db.query(UserDecoder).filter(UserDecoder.id == decoder_id)
    if user.role != "admin":
        query = query.filter(UserDecoder.owner_user_id == user.id)
    decoder = query.first()
    if not decoder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decoder not found")
    return decoder


@router.get("", response_model=list[DecoderResponse])
def list_decoders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DecoderResponse]:
    results = _builtin_decoders()

    query = db.query(UserDecoder)
    if current_user.role != "admin":
        query = query.filter(UserDecoder.owner_user_id == current_user.id)
    uploaded = query.order_by(UserDecoder.uploaded_at.desc()).all()

    for decoder in uploaded:
        size_bytes = Path(decoder.storage_path).stat().st_size if decoder.storage_path else 0
        results.append(
            DecoderResponse(
                id=decoder.id,
                name=decoder.filename_original,
                kind="uploaded",
                size_bytes=size_bytes,
                uploaded_at=decoder.uploaded_at.isoformat(),
            )
        )

    return results


@router.post(
    "/upload",
    response_model=UploadResponse,
    dependencies=[Depends(require_roles(["editor", "admin"]))],
)
def upload_decoder(
    upload: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UploadResponse:
    original_name, storage_path, size_bytes = save_decoder_upload(upload)

    decoder = UserDecoder(
        owner_user_id=current_user.id,
        filename_original=original_name,
        storage_path=storage_path,
    )
    db.add(decoder)
    db.commit()
    db.refresh(decoder)

    return UploadResponse(id=decoder.id, name=decoder.filename_original, size_bytes=size_bytes)


@router.get("/{decoder_id}", response_model=DecoderResponse)
def get_decoder(
    decoder_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DecoderResponse:
    if decoder_id.startswith("builtin:"):
        path = _get_builtin_path(decoder_id)
        return DecoderResponse(
            id=decoder_id,
            name=path.name,
            kind="builtin",
            size_bytes=path.stat().st_size,
            uploaded_at=None,
        )

    decoder = _get_user_decoder(db, decoder_id, current_user)
    size_bytes = Path(decoder.storage_path).stat().st_size if decoder.storage_path else 0
    return DecoderResponse(
        id=decoder.id,
        name=decoder.filename_original,
        kind="uploaded",
        size_bytes=size_bytes,
        uploaded_at=decoder.uploaded_at.isoformat(),
    )


@router.get("/{decoder_id}/source", response_class=PlainTextResponse)
def get_decoder_source(
    decoder_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> str:
    if decoder_id.startswith("builtin:"):
        path = _get_builtin_path(decoder_id)
        return path.read_text(encoding="utf-8")

    decoder = _get_user_decoder(db, decoder_id, current_user)
    path = Path(decoder.storage_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Decoder source missing")
    return path.read_text(encoding="utf-8")


@router.delete(
    "/{decoder_id}",
    dependencies=[Depends(require_roles(["editor", "admin"]))],
)
def delete_uploaded_decoder(
    decoder_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    if decoder_id.startswith("builtin:"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Built-in decoders cannot be deleted",
        )

    decoder = _get_user_decoder(db, decoder_id, current_user)
    delete_decoder(decoder.storage_path)
    db.delete(decoder)
    db.commit()
    return {"status": "deleted"}
