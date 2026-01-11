from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.models import User


def bootstrap_admin(db: Session) -> None:
    settings = get_settings()
    if not settings.admin_email or not settings.admin_password:
        return

    email = settings.admin_email.lower().strip()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return

    admin = User(
        email=email,
        password_hash=hash_password(settings.admin_password),
        role="admin",
        is_active=True,
    )
    db.add(admin)
    db.commit()
