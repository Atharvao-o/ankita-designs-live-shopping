from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.social import PostLike, SavedPost, SavedProduct, VendorFollow, VendorPost, VendorPublicProfile
from app.models.stall import Stall
from app.models.user import User
from app.models.vendor import Vendor
from app.services.db_data_service import serialize_product, serialize_stall, slugify, to_iso


ALLOWED_POST_TYPES = {"product", "offer", "announcement", "live", "event"}
ALLOWED_POST_STATUSES = {"draft", "published", "archived"}
ALLOWED_MODERATION_STATUSES = {"pending", "approved", "rejected"}


def normalize_slug(value: str) -> str:
    return slugify(value)[:180]


def generate_unique_vendor_slug(db: Session, vendor: Vendor, requested_slug: str | None = None) -> str:
    base = normalize_slug(requested_slug or vendor.display_name or vendor.business_name or vendor.id)
    existing = db.scalar(select(VendorPublicProfile).where(VendorPublicProfile.slug == base))
    if existing is None or existing.vendor_id == vendor.id:
        return base
    deterministic = normalize_slug(f"{base}-{vendor.id[:8]}")
    existing = db.scalar(select(VendorPublicProfile).where(VendorPublicProfile.slug == deterministic))
    if existing is None or existing.vendor_id == vendor.id:
        return deterministic
    suffix = 2
    while True:
        candidate = normalize_slug(f"{deterministic}-{suffix}")
        existing = db.scalar(select(VendorPublicProfile).where(VendorPublicProfile.slug == candidate))
        if existing is None or existing.vendor_id == vendor.id:
            return candidate
        suffix += 1


def ensure_vendor_public_profile(db: Session, vendor: Vendor) -> VendorPublicProfile:
    profile = db.scalar(select(VendorPublicProfile).where(VendorPublicProfile.vendor_id == vendor.id))
    if profile is not None:
        return profile
    profile = VendorPublicProfile(
        id=str(uuid4()),
        vendor_id=vendor.id,
        slug=generate_unique_vendor_slug(db, vendor),
        display_name=vendor.display_name or vendor.business_name,
        bio=vendor.business_description,
        category=vendor.business_category,
        profile_image_url=None,
        banner_image_url=None,
        website_url=vendor.website,
        instagram_url=vendor.instagram,
        whatsapp=vendor.whatsapp,
        is_public=True,
    )
    db.add(profile)
    db.flush()
    return profile


def vendor_is_public(vendor: Vendor | None, profile: VendorPublicProfile | None = None) -> bool:
    if vendor is None or vendor.status != "approved":
        return False
    return bool(profile.is_public) if profile else True


def visible_post_filters() -> tuple:
    return (
        VendorPost.status == "published",
        VendorPost.moderation_status == "approved",
        Vendor.status == "approved",
        VendorPublicProfile.is_public.is_(True),
    )


def count_vendor_followers(db: Session, vendor_id: str) -> int:
    return db.scalar(select(func.count(VendorFollow.id)).where(VendorFollow.vendor_id == vendor_id)) or 0


def count_vendor_posts(db: Session, vendor_id: str) -> int:
    return db.scalar(
        select(func.count(VendorPost.id))
        .join(Vendor, Vendor.id == VendorPost.vendor_id)
        .join(VendorPublicProfile, VendorPublicProfile.vendor_id == Vendor.id)
        .where(VendorPost.vendor_id == vendor_id, *visible_post_filters())
    ) or 0


def count_vendor_products(db: Session, vendor_id: str) -> int:
    return db.scalar(select(func.count(Product.id)).where(Product.vendor_id == vendor_id, Product.status == "active")) or 0


def user_follows_vendor(db: Session, user: User | None, vendor_id: str) -> bool:
    if user is None or user.role != "user":
        return False
    return db.scalar(
        select(VendorFollow.id).where(VendorFollow.user_id == user.id, VendorFollow.vendor_id == vendor_id)
    ) is not None


def user_liked_post(db: Session, user: User | None, post_id: str) -> bool:
    if user is None or user.role != "user":
        return False
    return db.scalar(select(PostLike.id).where(PostLike.user_id == user.id, PostLike.post_id == post_id)) is not None


def user_saved_post(db: Session, user: User | None, post_id: str) -> bool:
    if user is None or user.role != "user":
        return False
    return db.scalar(select(SavedPost.id).where(SavedPost.user_id == user.id, SavedPost.post_id == post_id)) is not None


def count_post_likes(db: Session, post_id: str) -> int:
    return db.scalar(select(func.count(PostLike.id)).where(PostLike.post_id == post_id)) or 0


def count_post_saves(db: Session, post_id: str) -> int:
    return db.scalar(select(func.count(SavedPost.id)).where(SavedPost.post_id == post_id)) or 0


def serialize_vendor_public_profile(
    db: Session,
    profile: VendorPublicProfile,
    vendor: Vendor | None = None,
    viewer: User | None = None,
) -> dict:
    vendor = vendor or db.get(Vendor, profile.vendor_id)
    return {
        "id": profile.id,
        "vendorId": profile.vendor_id,
        "slug": profile.slug,
        "displayName": profile.display_name,
        "bio": profile.bio,
        "category": profile.category,
        "profileImageUrl": profile.profile_image_url,
        "bannerImageUrl": profile.banner_image_url,
        "websiteUrl": profile.website_url,
        "instagramUrl": profile.instagram_url,
        "whatsapp": profile.whatsapp,
        "isPublic": profile.is_public,
        "followerCount": count_vendor_followers(db, profile.vendor_id),
        "postCount": count_vendor_posts(db, profile.vendor_id) if vendor and vendor.status == "approved" else 0,
        "productCount": count_vendor_products(db, profile.vendor_id),
        "followingByMe": user_follows_vendor(db, viewer, profile.vendor_id),
        "createdAt": to_iso(profile.created_at),
        "updatedAt": to_iso(profile.updated_at),
    }


def serialize_vendor_post(db: Session, post: VendorPost, viewer: User | None = None) -> dict:
    vendor = db.get(Vendor, post.vendor_id)
    profile = ensure_vendor_public_profile(db, vendor) if vendor else None
    product = db.get(Product, post.product_id) if post.product_id else None
    media_urls = post.media_urls if isinstance(post.media_urls, list) else []
    return {
        "id": post.id,
        "vendorId": post.vendor_id,
        "productId": post.product_id,
        "stallId": post.stall_id,
        "exhibitionId": post.exhibition_id,
        "postType": post.post_type,
        "caption": post.caption,
        "mediaUrls": media_urls,
        "thumbnailUrl": post.thumbnail_url,
        "status": post.status,
        "moderationStatus": post.moderation_status,
        "rejectionReason": post.rejection_reason,
        "isFeatured": post.is_featured,
        "isPromoted": post.is_promoted,
        "publishedAt": to_iso(post.published_at),
        "createdAt": to_iso(post.created_at),
        "updatedAt": to_iso(post.updated_at),
        "vendor": serialize_vendor_public_profile(db, profile, vendor, viewer) if profile else None,
        "product": serialize_product(product) if product else None,
        "likeCount": count_post_likes(db, post.id),
        "saveCount": count_post_saves(db, post.id),
        "likedByMe": user_liked_post(db, viewer, post.id),
        "savedByMe": user_saved_post(db, viewer, post.id),
        "followingVendor": user_follows_vendor(db, viewer, post.vendor_id),
    }


def get_public_post_or_404(db: Session, post_id: str) -> VendorPost:
    post = db.scalar(
        select(VendorPost)
        .join(Vendor, Vendor.id == VendorPost.vendor_id)
        .join(VendorPublicProfile, VendorPublicProfile.vendor_id == Vendor.id)
        .where(VendorPost.id == post_id, *visible_post_filters())
    )
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found.")
    return post


def get_public_vendor_by_slug_or_404(db: Session, slug: str) -> tuple[Vendor, VendorPublicProfile]:
    profile = db.scalar(select(VendorPublicProfile).where(VendorPublicProfile.slug == slug))
    vendor = db.get(Vendor, profile.vendor_id) if profile else None
    if profile is None or not vendor_is_public(vendor, profile):
        raise HTTPException(status_code=404, detail="Vendor profile not found.")
    return vendor, profile


def validate_vendor_owns_product(db: Session, vendor_id: str, product_id: str | None) -> Product | None:
    if product_id is None:
        return None
    product = db.get(Product, product_id)
    if product is None or product.vendor_id != vendor_id:
        raise HTTPException(status_code=400, detail="Linked product must belong to your vendor account.")
    return product


def validate_vendor_owns_stall(db: Session, vendor_id: str, stall_id: str | None) -> Stall | None:
    if stall_id is None:
        return None
    stall = db.get(Stall, stall_id)
    if stall is None or stall.vendor_id != vendor_id:
        raise HTTPException(status_code=400, detail="Linked stall must belong to your vendor account.")
    return stall


def assert_post_type(value: str) -> str:
    if value not in ALLOWED_POST_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported post type.")
    return value


def assert_post_status(value: str) -> str:
    if value not in ALLOWED_POST_STATUSES:
        raise HTTPException(status_code=400, detail="Unsupported post status.")
    return value


def public_feed_query(
    category: str | None = None,
    vendor_id: str | None = None,
    post_type: str | None = None,
    cursor: str | None = None,
):
    query = (
        select(VendorPost)
        .join(Vendor, Vendor.id == VendorPost.vendor_id)
        .join(VendorPublicProfile, VendorPublicProfile.vendor_id == Vendor.id)
        .where(*visible_post_filters())
    )
    if category:
        query = query.outerjoin(Product, Product.id == VendorPost.product_id)
        query = query.where(or_(VendorPublicProfile.category == category, Product.category == category))
    if vendor_id:
        query = query.where(VendorPost.vendor_id == vendor_id)
    if post_type and post_type != "all":
        query = query.where(VendorPost.post_type == post_type)
    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
            query = query.where(func.coalesce(VendorPost.published_at, VendorPost.created_at) < cursor_dt)
        except ValueError:
            pass
    return query.order_by(
        VendorPost.is_promoted.desc(),
        VendorPost.is_featured.desc(),
        func.coalesce(VendorPost.published_at, VendorPost.created_at).desc(),
    )


def get_saved_product_or_404(db: Session, product_id: str) -> Product:
    product = db.get(Product, product_id)
    vendor = db.get(Vendor, product.vendor_id) if product else None
    if product is None or product.status != "active" or vendor is None or vendor.status != "approved":
        raise HTTPException(status_code=404, detail="Product not found.")
    return product


def get_user_social_payload(db: Session, user: User) -> dict:
    follows = db.scalars(select(VendorFollow).where(VendorFollow.user_id == user.id).order_by(VendorFollow.created_at.desc())).all()
    followed_profiles = []
    for follow in follows:
        vendor = db.get(Vendor, follow.vendor_id)
        if not vendor:
            continue
        profile = ensure_vendor_public_profile(db, vendor)
        if not vendor_is_public(vendor, profile):
            continue
        followed_profiles.append(serialize_vendor_public_profile(db, profile, vendor, user))

    saved_post_rows = db.scalars(select(SavedPost).where(SavedPost.user_id == user.id).order_by(SavedPost.created_at.desc())).all()
    saved_posts = []
    for row in saved_post_rows:
        post = db.scalar(
            select(VendorPost)
            .join(Vendor, Vendor.id == VendorPost.vendor_id)
            .join(VendorPublicProfile, VendorPublicProfile.vendor_id == Vendor.id)
            .where(VendorPost.id == row.post_id, *visible_post_filters())
        )
        if post:
            saved_posts.append(serialize_vendor_post(db, post, user))

    saved_product_rows = db.scalars(select(SavedProduct).where(SavedProduct.user_id == user.id).order_by(SavedProduct.created_at.desc())).all()
    saved_products = []
    for row in saved_product_rows:
        product = db.get(Product, row.product_id)
        vendor = db.get(Vendor, product.vendor_id) if product else None
        if product and product.status == "active" and vendor and vendor.status == "approved":
            saved_products.append(serialize_product(product))

    return {
        "followedVendors": followed_profiles,
        "savedPosts": saved_posts,
        "savedProducts": saved_products,
        "counts": {
            "followedVendors": len(followed_profiles),
            "savedPosts": len(saved_posts),
            "savedProducts": len(saved_products),
        },
    }
