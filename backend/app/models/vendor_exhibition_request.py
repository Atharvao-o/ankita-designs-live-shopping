from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class VendorExhibitionRequest(Base):
    __tablename__ = "vendor_exhibition_requests"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    exhibition_id: Mapped[str] = mapped_column(ForeignKey("exhibitions.id"), nullable=False)
    vendor_id: Mapped[str] = mapped_column(ForeignKey("vendors.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="pending")
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    admin_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reviewed_by_admin_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
