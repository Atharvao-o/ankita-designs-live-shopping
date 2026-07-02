from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    avatar: Mapped[str | None] = mapped_column(String(255), nullable=True)
    onboarding_completed_roles: Mapped[str | None] = mapped_column(Text, nullable=True)
    onboarding_skipped_roles: Mapped[str | None] = mapped_column(Text, nullable=True)
    onboarding_version: Mapped[str | None] = mapped_column(String(32), nullable=True)
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    onboarding_skipped_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    phone_verified_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
