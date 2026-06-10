from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class LiveSession(Base):
    __tablename__ = "live_sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    stall_id: Mapped[str] = mapped_column(ForeignKey("stalls.id"), nullable=False)
    vendor_id: Mapped[str] = mapped_column(ForeignKey("vendors.id"), nullable=False)
    livekit_room_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(64), nullable=False)
    stream_mode: Mapped[str] = mapped_column(String(32), default="camera")
    camera_enabled: Mapped[int] = mapped_column(Integer, default=0)
    rtmp_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stream_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    token_mode: Mapped[str] = mapped_column(String(32), default="real")
    pinned_product_id: Mapped[str | None] = mapped_column(ForeignKey("products.id"), nullable=True)
    viewer_count: Mapped[int] = mapped_column(Integer, default=0)
    likes_count: Mapped[int] = mapped_column(Integer, default=0)
    follow_count: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class LiveChatMessage(Base):
    __tablename__ = "live_chat_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    live_session_id: Mapped[str] = mapped_column(ForeignKey("live_sessions.id"), nullable=False)
    sender_id: Mapped[str] = mapped_column(String, nullable=False)
    sender_name: Mapped[str] = mapped_column(String(255), nullable=False)
    sender_role: Mapped[str] = mapped_column(String(32), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    message_type: Mapped[str] = mapped_column(String(32), default="text")
    product_id: Mapped[str | None] = mapped_column(String, nullable=True)
    offered_price: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    offer_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
