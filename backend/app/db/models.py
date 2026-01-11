import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


def _utcnow() -> datetime:
    return datetime.utcnow()


def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="viewer")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, nullable=False, default=_utcnow)
    updated_at = Column(DateTime, nullable=False, default=_utcnow, onupdate=_utcnow)


class DeviceCredential(Base):
    __tablename__ = "device_credentials"

    id = Column(String(36), primary_key=True, default=_uuid)
    owner_user_id = Column(String(36), nullable=True, index=True)
    devaddr = Column(String(16), nullable=False, index=True)
    device_name = Column(String(255), nullable=True)
    nwkskey = Column(String(64), nullable=False)
    appskey = Column(String(64), nullable=False)
    created_at = Column(DateTime, nullable=False, default=_utcnow)
    updated_at = Column(DateTime, nullable=False, default=_utcnow, onupdate=_utcnow)


class LogFile(Base):
    __tablename__ = "log_files"

    id = Column(String(36), primary_key=True, default=_uuid)
    owner_user_id = Column(String(36), nullable=True, index=True)
    original_filename = Column(String(255), nullable=False)
    storage_path = Column(String(512), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime, nullable=False, default=_utcnow)
    source_type = Column(String(20), nullable=False, default="uploaded")
    metadata_json = Column(JSON, nullable=True)


class UserDecoder(Base):
    __tablename__ = "user_decoders"

    id = Column(String(36), primary_key=True, default=_uuid)
    owner_user_id = Column(String(36), nullable=True, index=True)
    filename_original = Column(String(255), nullable=False)
    storage_path = Column(String(512), nullable=False)
    uploaded_at = Column(DateTime, nullable=False, default=_utcnow)


class ReplayJob(Base):
    __tablename__ = "replay_jobs"

    id = Column(String(36), primary_key=True, default=_uuid)
    log_file_id = Column(String(36), nullable=False, index=True)
    udp_host = Column(String(255), nullable=False)
    udp_port = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="queued")
    stats_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=_utcnow)
    updated_at = Column(DateTime, nullable=False, default=_utcnow, onupdate=_utcnow)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=_uuid)
    user_id = Column(String(36), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    payload_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=_utcnow)
    detail = Column(Text, nullable=True)
