from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Stall(Base):
    __tablename__ = "stalls"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    exhibition_id: Mapped[str] = mapped_column(ForeignKey("exhibitions.id"), nullable=False)
    vendor_id: Mapped[str | None] = mapped_column(ForeignKey("vendors.id"), nullable=True)
    stall_code: Mapped[str | None] = mapped_column(String(32), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    map_x: Mapped[int] = mapped_column(Integer, nullable=False)
    map_y: Mapped[int] = mapped_column(Integer, nullable=False)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    position_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    zone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    stall_type: Mapped[str] = mapped_column(String(32), nullable=False, default="basic")
    rent_amount: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    booking_status: Mapped[str] = mapped_column(String(64), nullable=False, default="draft")
    payment_status: Mapped[str] = mapped_column(String(64), nullable=False, default="unpaid")
    product_limit: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    status: Mapped[str] = mapped_column(String(64), nullable=False)
    viewer_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    banner_image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    vendor_logo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    featured_image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    live_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    break_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    delivery_area: Mapped[str | None] = mapped_column(Text, nullable=True)
    active_from: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    active_to: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    proximity_radius: Mapped[int | None] = mapped_column(Integer, nullable=True)
    route: Mapped[str | None] = mapped_column(String(500), nullable=True)
    social_links: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
