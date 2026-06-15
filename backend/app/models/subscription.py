from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    __table_args__ = (Index("ix_subscription_plans_is_active", "is_active"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    product_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    post_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    live_slot_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    exhibition_join_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ad_credit_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)
    priority_level: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    analytics_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class VendorSubscription(Base):
    __tablename__ = "vendor_subscriptions"
    __table_args__ = (
        Index("ix_vendor_subscriptions_vendor_id", "vendor_id"),
        Index("ix_vendor_subscriptions_status", "status"),
        Index("ix_vendor_subscriptions_payment_status", "payment_status"),
        Index("ix_vendor_subscriptions_ends_at", "ends_at"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    vendor_id: Mapped[str] = mapped_column(ForeignKey("vendors.id"), nullable=False)
    plan_id: Mapped[str] = mapped_column(ForeignKey("subscription_plans.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending_payment")
    payment_status: Mapped[str] = mapped_column(String(32), nullable=False, default="unpaid")
    payment_reference: Mapped[str | None] = mapped_column(String(255), nullable=True)
    payment_proof_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved_by_admin_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class LiveSlot(Base):
    __tablename__ = "live_slots"
    __table_args__ = (
        Index("ix_live_slots_vendor_id", "vendor_id"),
        Index("ix_live_slots_status", "status"),
        Index("ix_live_slots_start_time", "start_time"),
        Index("ix_live_slots_end_time", "end_time"),
        Index("ix_live_slots_exhibition_id", "exhibition_id"),
        Index("ix_live_slots_stall_id", "stall_id"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    vendor_id: Mapped[str] = mapped_column(ForeignKey("vendors.id"), nullable=False)
    exhibition_id: Mapped[str | None] = mapped_column(ForeignKey("exhibitions.id"), nullable=True)
    stall_id: Mapped[str | None] = mapped_column(ForeignKey("stalls.id"), nullable=True)
    slot_type: Mapped[str] = mapped_column(String(32), nullable=False, default="subscription")
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    start_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="requested")
    payment_status: Mapped[str] = mapped_column(String(32), nullable=False, default="not_required")
    payment_proof_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    approved_by_admin_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
