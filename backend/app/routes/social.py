from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.exhibition import Exhibition
from app.models.product import Product
from app.models.social import PostLike, SavedPost, SavedProduct, VendorFollow, VendorPost, VendorPublicProfile
from app.models.stall import Stall
from app.models.user import User
from app.models.vendor import Vendor
from app.schemas.social import (
    AdminPostModerationUpdate,
    AdminProductModerationUpdate,
    FeedResponse,
    FollowStateResponse,
    VendorPostCreate,
    VendorPostUpdate,
    VendorPublicProfileUpdate,
)
from app.services.auth_context import current_user_from_request
from app.services.db_data_service import serialize_product, serialize_stall
from app.services.social_service import (
    assert_post_status,
    assert_post_type,
    count_vendor_followers,
    ensure_vendor_public_profile,
    generate_unique_vendor_slug,
    get_public_post_or_404,
    get_public_vendor_by_slug_or_404,
    get_saved_product_or_404,
    get_user_social_payload,
    public_feed_query,
    serialize_vendor_post,
    serialize_vendor_public_profile,
    user_follows_vendor,
    validate_vendor_owns_product,
    validate_vendor_owns_stall,
)


router = APIRouter(tags=["social"])


def require_user(request: Request, db: Session) -> User:
    user = current_user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=401, detail="Login required.")
    return user


def require_customer(request: Request, db: Session) -> User:
    user = require_user(request, db)
    if user.role != "user":
        raise HTTPException(status_code=403, detail="Customer account required.")
    return user


def require_vendor_user(request: Request, db: Session) -> tuple[User, Vendor]:
    user = require_user(request, db)
    if user.role != "vendor":
        raise HTTPException(status_code=403, detail="Vendor account required.")
    vendor = db.scalar(select(Vendor).where(Vendor.user_id == user.id))
    if vendor is None:
        raise HTTPException(status_code=404, detail="Vendor profile not found.")
    return user, vendor


def require_admin_user(request: Request, db: Session) -> User:
    user = require_user(request, db)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin account required.")
    return user


def optional_viewer(request: Request, db: Session) -> User | None:
    return current_user_from_request(request, db)


def get_vendor_post_for_owner(db: Session, vendor: Vendor, post_id: str) -> VendorPost:
    post = db.get(VendorPost, post_id)
    if post is None or post.vendor_id != vendor.id:
        raise HTTPException(status_code=404, detail="Post not found.")
    return post


def apply_post_payload(db: Session, post: VendorPost, vendor: Vendor, payload: VendorPostCreate | VendorPostUpdate) -> None:
    updates = payload.model_dump(exclude_unset=True)
    if "postType" in updates:
        post.post_type = assert_post_type(updates["postType"])
    if "caption" in updates:
        post.caption = updates["caption"].strip()
    if "mediaUrls" in updates:
        post.media_urls = updates["mediaUrls"] or []
    if "thumbnailUrl" in updates:
        post.thumbnail_url = updates["thumbnailUrl"]
    if "productId" in updates:
        validate_vendor_owns_product(db, vendor.id, updates["productId"])
        post.product_id = updates["productId"]
    if "stallId" in updates:
        validate_vendor_owns_stall(db, vendor.id, updates["stallId"])
        post.stall_id = updates["stallId"]
    if "exhibitionId" in updates:
        exhibition_id = updates["exhibitionId"]
        if exhibition_id is not None and db.get(Exhibition, exhibition_id) is None:
            raise HTTPException(status_code=400, detail="Linked exhibition does not exist.")
        post.exhibition_id = exhibition_id
    if "status" in updates:
        status = assert_post_status(updates["status"])
        if status == "published" and vendor.status != "approved":
            raise HTTPException(status_code=403, detail="Vendor approval is required before publishing posts.")
        post.status = status
        if status == "published" and post.published_at is None:
            post.published_at = datetime.utcnow()
    post.updated_at = datetime.utcnow()


@router.get("/feed", response_model=FeedResponse)
def get_feed(
    request: Request,
    cursor: str | None = None,
    limit: int = 20,
    category: str | None = None,
    vendor_id: str | None = None,
    post_type: str | None = None,
    db: Session = Depends(get_db),
) -> dict:
    viewer = optional_viewer(request, db)
    limit = min(max(limit, 1), 50)
    posts = db.scalars(public_feed_query(category, vendor_id, post_type, cursor).limit(limit + 1)).all()
    next_cursor = None
    if len(posts) > limit:
        last = posts[limit - 1]
        next_cursor = (last.published_at or last.created_at).isoformat()
        posts = posts[:limit]
    return {"posts": [serialize_vendor_post(db, post, viewer) for post in posts], "nextCursor": next_cursor}


@router.get("/posts/{post_id}")
def get_post(post_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    viewer = optional_viewer(request, db)
    return serialize_vendor_post(db, get_public_post_or_404(db, post_id), viewer)


@router.get("/vendors/{slug}")
def get_public_vendor(slug: str, request: Request, db: Session = Depends(get_db)) -> dict:
    viewer = optional_viewer(request, db)
    vendor, profile = get_public_vendor_by_slug_or_404(db, slug)
    return serialize_vendor_public_profile(db, profile, vendor, viewer)


@router.get("/vendors/{slug}/posts")
def get_public_vendor_posts(slug: str, request: Request, db: Session = Depends(get_db)) -> list[dict]:
    viewer = optional_viewer(request, db)
    vendor, _profile = get_public_vendor_by_slug_or_404(db, slug)
    posts = db.scalars(public_feed_query(vendor_id=vendor.id).limit(80)).all()
    return [serialize_vendor_post(db, post, viewer) for post in posts]


@router.get("/vendors/{slug}/products")
def get_public_vendor_products(slug: str, db: Session = Depends(get_db)) -> list[dict]:
    vendor, _profile = get_public_vendor_by_slug_or_404(db, slug)
    products = db.scalars(select(Product).where(Product.vendor_id == vendor.id, Product.status == "active")).all()
    return [serialize_product(product) for product in products]


@router.get("/vendors/{slug}/stalls")
def get_public_vendor_stalls(slug: str, db: Session = Depends(get_db)) -> list[dict]:
    vendor, _profile = get_public_vendor_by_slug_or_404(db, slug)
    stalls = db.scalars(select(Stall).where(Stall.vendor_id == vendor.id)).all()
    return [serialize_stall(db, stall) for stall in stalls]


@router.post("/vendors/{vendor_id}/follow", response_model=FollowStateResponse)
def follow_vendor(vendor_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    user = require_customer(request, db)
    vendor = db.get(Vendor, vendor_id)
    if vendor is None or vendor.status != "approved":
        raise HTTPException(status_code=404, detail="Vendor not found.")
    existing = db.scalar(select(VendorFollow).where(VendorFollow.user_id == user.id, VendorFollow.vendor_id == vendor_id))
    if existing is None:
        db.add(VendorFollow(id=str(uuid4()), user_id=user.id, vendor_id=vendor_id))
        db.commit()
    return {"following": True, "followerCount": count_vendor_followers(db, vendor_id)}


@router.delete("/vendors/{vendor_id}/follow", response_model=FollowStateResponse)
def unfollow_vendor(vendor_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    user = require_customer(request, db)
    existing = db.scalar(select(VendorFollow).where(VendorFollow.user_id == user.id, VendorFollow.vendor_id == vendor_id))
    if existing:
        db.delete(existing)
        db.commit()
    return {"following": False, "followerCount": count_vendor_followers(db, vendor_id)}


@router.post("/posts/{post_id}/like")
def like_post(post_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    user = require_customer(request, db)
    get_public_post_or_404(db, post_id)
    existing = db.scalar(select(PostLike).where(PostLike.user_id == user.id, PostLike.post_id == post_id))
    if existing is None:
        db.add(PostLike(id=str(uuid4()), user_id=user.id, post_id=post_id))
        db.commit()
    post = db.get(VendorPost, post_id)
    return serialize_vendor_post(db, post, user)


@router.delete("/posts/{post_id}/like")
def unlike_post(post_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    user = require_customer(request, db)
    post = get_public_post_or_404(db, post_id)
    existing = db.scalar(select(PostLike).where(PostLike.user_id == user.id, PostLike.post_id == post_id))
    if existing:
        db.delete(existing)
        db.commit()
    return serialize_vendor_post(db, post, user)


@router.post("/posts/{post_id}/save")
def save_post(post_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    user = require_customer(request, db)
    get_public_post_or_404(db, post_id)
    existing = db.scalar(select(SavedPost).where(SavedPost.user_id == user.id, SavedPost.post_id == post_id))
    if existing is None:
        db.add(SavedPost(id=str(uuid4()), user_id=user.id, post_id=post_id))
        db.commit()
    post = db.get(VendorPost, post_id)
    return serialize_vendor_post(db, post, user)


@router.delete("/posts/{post_id}/save")
def unsave_post(post_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    user = require_customer(request, db)
    post = get_public_post_or_404(db, post_id)
    existing = db.scalar(select(SavedPost).where(SavedPost.user_id == user.id, SavedPost.post_id == post_id))
    if existing:
        db.delete(existing)
        db.commit()
    return serialize_vendor_post(db, post, user)


@router.post("/products/{product_id}/save")
def save_product(product_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    user = require_customer(request, db)
    product = get_saved_product_or_404(db, product_id)
    existing = db.scalar(select(SavedProduct).where(SavedProduct.user_id == user.id, SavedProduct.product_id == product_id))
    if existing is None:
        db.add(SavedProduct(id=str(uuid4()), user_id=user.id, product_id=product_id))
        db.commit()
    return serialize_product(product)


@router.delete("/products/{product_id}/save")
def unsave_product(product_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    user = require_customer(request, db)
    product = get_saved_product_or_404(db, product_id)
    existing = db.scalar(select(SavedProduct).where(SavedProduct.user_id == user.id, SavedProduct.product_id == product_id))
    if existing:
        db.delete(existing)
        db.commit()
    return serialize_product(product)


@router.get("/user/social")
def get_user_social(request: Request, db: Session = Depends(get_db)) -> dict:
    return get_user_social_payload(db, require_customer(request, db))


@router.get("/vendor/profile")
def get_vendor_profile(request: Request, db: Session = Depends(get_db)) -> dict:
    user, vendor = require_vendor_user(request, db)
    profile = ensure_vendor_public_profile(db, vendor)
    db.commit()
    return serialize_vendor_public_profile(db, profile, vendor, user)


@router.patch("/vendor/profile")
def update_vendor_profile(payload: VendorPublicProfileUpdate, request: Request, db: Session = Depends(get_db)) -> dict:
    user, vendor = require_vendor_user(request, db)
    profile = ensure_vendor_public_profile(db, vendor)
    updates = payload.model_dump(exclude_unset=True)
    if "displayName" in updates and updates["displayName"] is not None:
        profile.display_name = updates["displayName"].strip()
    if "slug" in updates and updates["slug"] is not None:
        profile.slug = generate_unique_vendor_slug(db, vendor, updates["slug"])
    field_map = {
        "bio": "bio",
        "category": "category",
        "profileImageUrl": "profile_image_url",
        "bannerImageUrl": "banner_image_url",
        "websiteUrl": "website_url",
        "instagramUrl": "instagram_url",
        "whatsapp": "whatsapp",
        "isPublic": "is_public",
    }
    for incoming, attribute in field_map.items():
        if incoming in updates:
            setattr(profile, attribute, updates[incoming])
    profile.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(profile)
    return serialize_vendor_public_profile(db, profile, vendor, user)


@router.get("/vendor/posts")
def get_vendor_posts(request: Request, db: Session = Depends(get_db)) -> list[dict]:
    user, vendor = require_vendor_user(request, db)
    ensure_vendor_public_profile(db, vendor)
    db.commit()
    posts = db.scalars(select(VendorPost).where(VendorPost.vendor_id == vendor.id).order_by(VendorPost.created_at.desc())).all()
    return [serialize_vendor_post(db, post, user) for post in posts]


@router.post("/vendor/posts")
def create_vendor_post(payload: VendorPostCreate, request: Request, db: Session = Depends(get_db)) -> dict:
    user, vendor = require_vendor_user(request, db)
    if payload.status == "published" and vendor.status != "approved":
        raise HTTPException(status_code=403, detail="Vendor approval is required before publishing posts.")
    ensure_vendor_public_profile(db, vendor)
    validate_vendor_owns_product(db, vendor.id, payload.productId)
    validate_vendor_owns_stall(db, vendor.id, payload.stallId)
    if payload.exhibitionId and db.get(Exhibition, payload.exhibitionId) is None:
        raise HTTPException(status_code=400, detail="Linked exhibition does not exist.")
    post = VendorPost(
        id=str(uuid4()),
        vendor_id=vendor.id,
        product_id=payload.productId,
        stall_id=payload.stallId,
        exhibition_id=payload.exhibitionId,
        post_type=assert_post_type(payload.postType),
        caption=payload.caption.strip(),
        media_urls=payload.mediaUrls,
        thumbnail_url=payload.thumbnailUrl,
        status=assert_post_status(payload.status),
        moderation_status="pending",
        published_at=datetime.utcnow() if payload.status == "published" else None,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return serialize_vendor_post(db, post, user)


@router.patch("/vendor/posts/{post_id}")
def update_vendor_post(post_id: str, payload: VendorPostUpdate, request: Request, db: Session = Depends(get_db)) -> dict:
    user, vendor = require_vendor_user(request, db)
    post = get_vendor_post_for_owner(db, vendor, post_id)
    apply_post_payload(db, post, vendor, payload)
    if payload.status == "published":
        post.moderation_status = "pending"
        post.rejection_reason = None
    db.commit()
    db.refresh(post)
    return serialize_vendor_post(db, post, user)


@router.delete("/vendor/posts/{post_id}")
def archive_vendor_post(post_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    user, vendor = require_vendor_user(request, db)
    post = get_vendor_post_for_owner(db, vendor, post_id)
    post.status = "archived"
    post.updated_at = datetime.utcnow()
    db.commit()
    return serialize_vendor_post(db, post, user)


@router.post("/vendor/posts/{post_id}/publish")
def publish_vendor_post(post_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    user, vendor = require_vendor_user(request, db)
    if vendor.status != "approved":
        raise HTTPException(status_code=403, detail="Vendor approval is required before publishing posts.")
    post = get_vendor_post_for_owner(db, vendor, post_id)
    ensure_vendor_public_profile(db, vendor)
    post.status = "published"
    post.moderation_status = "pending"
    post.rejection_reason = None
    post.published_at = post.published_at or datetime.utcnow()
    post.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(post)
    return serialize_vendor_post(db, post, user)


@router.get("/admin/feed")
def get_admin_feed(
    request: Request,
    status: str | None = None,
    moderation_status: str | None = None,
    post_type: str | None = None,
    vendor_id: str | None = None,
    featured: bool | None = None,
    promoted: bool | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
) -> list[dict]:
    require_admin_user(request, db)
    query = select(VendorPost).order_by(VendorPost.created_at.desc())
    if status and status != "all":
        query = query.where(VendorPost.status == status)
    if moderation_status and moderation_status != "all":
        query = query.where(VendorPost.moderation_status == moderation_status)
    if post_type and post_type != "all":
        query = query.where(VendorPost.post_type == post_type)
    if vendor_id:
        query = query.where(VendorPost.vendor_id == vendor_id)
    if featured is not None:
        query = query.where(VendorPost.is_featured.is_(featured))
    if promoted is not None:
        query = query.where(VendorPost.is_promoted.is_(promoted))
    if search:
        query = query.where(VendorPost.caption.ilike(f"%{search}%"))
    posts = db.scalars(query.limit(200)).all()
    return [serialize_vendor_post(db, post) for post in posts]


@router.patch("/admin/feed/{post_id}/approve")
def approve_admin_post(post_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    require_admin_user(request, db)
    post = db.get(VendorPost, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found.")
    vendor = db.get(Vendor, post.vendor_id)
    if vendor:
        ensure_vendor_public_profile(db, vendor)
    post.status = "published"
    post.moderation_status = "approved"
    post.rejection_reason = None
    post.published_at = post.published_at or datetime.utcnow()
    post.updated_at = datetime.utcnow()
    db.commit()
    return serialize_vendor_post(db, post)


@router.patch("/admin/feed/{post_id}/reject")
def reject_admin_post(
    post_id: str,
    payload: AdminPostModerationUpdate,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    require_admin_user(request, db)
    post = db.get(VendorPost, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found.")
    post.moderation_status = "rejected"
    post.rejection_reason = payload.rejectionReason or "Rejected by admin."
    post.updated_at = datetime.utcnow()
    db.commit()
    return serialize_vendor_post(db, post)


@router.patch("/admin/feed/{post_id}/feature")
def feature_admin_post(
    post_id: str,
    request: Request,
    payload: AdminPostModerationUpdate | None = None,
    db: Session = Depends(get_db),
) -> dict:
    require_admin_user(request, db)
    post = db.get(VendorPost, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found.")
    post.is_featured = payload.value if payload and payload.value is not None else not post.is_featured
    post.updated_at = datetime.utcnow()
    db.commit()
    return serialize_vendor_post(db, post)


@router.patch("/admin/feed/{post_id}/promote")
def promote_admin_post(
    post_id: str,
    request: Request,
    payload: AdminPostModerationUpdate | None = None,
    db: Session = Depends(get_db),
) -> dict:
    require_admin_user(request, db)
    post = db.get(VendorPost, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found.")
    post.is_promoted = payload.value if payload and payload.value is not None else not post.is_promoted
    post.updated_at = datetime.utcnow()
    db.commit()
    return serialize_vendor_post(db, post)


@router.get("/admin/products")
def get_admin_products(request: Request, db: Session = Depends(get_db)) -> list[dict]:
    require_admin_user(request, db)
    products = db.scalars(select(Product).order_by(Product.title.asc()).limit(500)).all()
    response = []
    for product in products:
        vendor = db.get(Vendor, product.vendor_id)
        item = serialize_product(product)
        item["vendorName"] = vendor.display_name if vendor else "Vendor unavailable"
        item["vendorId"] = product.vendor_id
        response.append(item)
    return response


@router.patch("/admin/products/{product_id}")
def update_admin_product_moderation(
    product_id: str,
    payload: AdminProductModerationUpdate,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    require_admin_user(request, db)
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found.")
    if payload.status is not None:
        product.status = payload.status
    db.commit()
    db.refresh(product)
    vendor = db.get(Vendor, product.vendor_id)
    item = serialize_product(product)
    item["vendorName"] = vendor.display_name if vendor else "Vendor unavailable"
    return item
