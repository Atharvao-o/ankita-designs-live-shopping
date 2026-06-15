from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class VendorPublicProfile(Base):
    __tablename__ = "vendor_public_profiles"
    __table_args__ = (
        Index("ix_vendor_public_profiles_slug", "slug"),
        Index("ix_vendor_public_profiles_vendor_id", "vendor_id"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    vendor_id: Mapped[str] = mapped_column(ForeignKey("vendors.id"), nullable=False, unique=True)
    slug: Mapped[str] = mapped_column(String(180), nullable=False, unique=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(String(120), nullable=True)
    profile_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    banner_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    website_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    instagram_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    whatsapp: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class VendorPost(Base):
    __tablename__ = "vendor_posts"
    __table_args__ = (
        Index("ix_vendor_posts_vendor_id", "vendor_id"),
        Index("ix_vendor_posts_status", "status"),
        Index("ix_vendor_posts_moderation_status", "moderation_status"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    vendor_id: Mapped[str] = mapped_column(ForeignKey("vendors.id"), nullable=False)
    product_id: Mapped[str | None] = mapped_column(ForeignKey("products.id"), nullable=True)
    stall_id: Mapped[str | None] = mapped_column(ForeignKey("stalls.id"), nullable=True)
    exhibition_id: Mapped[str | None] = mapped_column(ForeignKey("exhibitions.id"), nullable=True)
    post_type: Mapped[str] = mapped_column(String(32), nullable=False, default="announcement")
    caption: Mapped[str] = mapped_column(Text, nullable=False)
    media_urls: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="draft")
    moderation_status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_promoted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class VendorFollow(Base):
    __tablename__ = "vendor_follows"
    __table_args__ = (
        UniqueConstraint("user_id", "vendor_id", name="uq_vendor_follows_user_vendor"),
        Index("ix_vendor_follows_user_id", "user_id"),
        Index("ix_vendor_follows_vendor_id", "vendor_id"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    vendor_id: Mapped[str] = mapped_column(ForeignKey("vendors.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PostLike(Base):
    __tablename__ = "post_likes"
    __table_args__ = (
        UniqueConstraint("user_id", "post_id", name="uq_post_likes_user_post"),
        Index("ix_post_likes_user_id", "user_id"),
        Index("ix_post_likes_post_id", "post_id"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    post_id: Mapped[str] = mapped_column(ForeignKey("vendor_posts.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SavedPost(Base):
    __tablename__ = "saved_posts"
    __table_args__ = (
        UniqueConstraint("user_id", "post_id", name="uq_saved_posts_user_post"),
        Index("ix_saved_posts_user_id", "user_id"),
        Index("ix_saved_posts_post_id", "post_id"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    post_id: Mapped[str] = mapped_column(ForeignKey("vendor_posts.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SavedProduct(Base):
    __tablename__ = "saved_products"
    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_saved_products_user_product"),
        Index("ix_saved_products_user_id", "user_id"),
        Index("ix_saved_products_product_id", "product_id"),
    )

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
