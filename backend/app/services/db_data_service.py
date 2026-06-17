from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.exhibition import Exhibition
from app.models.live_session import LiveChatMessage, LiveSession
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.stall import Stall
from app.models.user import User
from app.models.vendor import Vendor
from app.models.vendor_exhibition_request import VendorExhibitionRequest
from app.config import get_settings
VALID_EXHIBITION_STATUSES = {"draft", "scheduled", "live", "paused", "ended", "cancelled"}


def now_utc() -> datetime:
    return datetime.utcnow()


def to_iso(value: datetime | str | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return value.isoformat()


def is_live_session_current(session: LiveSession | None) -> bool:
    if session is None or session.status != "live" or session.started_at is None:
        return False
    stale_minutes = max(0, get_settings().live_session_stale_minutes)
    if stale_minutes <= 0:
        return True
    started_at = session.started_at.replace(tzinfo=None) if session.started_at.tzinfo else session.started_at
    return now_utc() - started_at <= timedelta(minutes=stale_minutes)


def end_stale_live_session(db: Session, session: LiveSession, stall: Stall | None = None) -> None:
    session.status = "ended"
    session.ended_at = session.ended_at or now_utc()
    target_stall = stall or db.get(Stall, session.stall_id)
    if target_stall is not None:
        target_stall.status = "assigned" if target_stall.vendor_id else "available"
        target_stall.live_status = "offline"
        target_stall.viewer_count = 0
        target_stall.updated_at = now_utc()


def parse_dt(value: str | datetime | None) -> datetime | None:
    if value is None or isinstance(value, datetime):
        return value
    return datetime.fromisoformat(value)


def as_int(value: int | float | Decimal | None) -> int:
    if value is None:
        return 0
    return int(value)


def slugify(value: str) -> str:
    cleaned = "".join(char.lower() if char.isalnum() else "-" for char in value.replace("&", "and"))
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")
    return cleaned.strip("-") or str(uuid4())


def unique_exhibition_id(db: Session, title: str) -> str:
    base = slugify(title)
    candidate = base
    suffix = 2
    while db.get(Exhibition, candidate) is not None:
        candidate = f"{base}-{suffix}"
        suffix += 1
    return candidate


def stall_code_for(index: int) -> str:
    section_index = index // 10
    section = chr(ord("A") + section_index) if section_index < 26 else f"Z{section_index - 25}"
    return f"{section}{(index % 10) + 1:02d}"


def validate_schedule(start_at: str | datetime | None, end_at: str | datetime | None) -> None:
    start = parse_dt(start_at)
    end = parse_dt(end_at)
    if start is not None and end is not None and start >= end:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_EXHIBITION_SCHEDULE", "message": "start_at must be before end_at."},
        )


def status_payload(exhibition: Exhibition) -> dict:
    server_time = now_utc()
    status = exhibition.status
    if status not in {"draft", "ended", "cancelled"} and exhibition.end_at <= server_time:
        status = "ended"
    elif status == "scheduled" and exhibition.start_at <= server_time < exhibition.end_at:
        status = "live"
    seconds_until_start = max(0, int((exhibition.start_at - server_time).total_seconds())) if status == "scheduled" else None
    seconds_until_end = max(0, int((exhibition.end_at - server_time).total_seconds())) if status == "live" else None
    can_user_enter = status == "live"
    can_vendor_go_live = status == "live"
    if status == "scheduled" and seconds_until_start is not None:
        message = f"Exhibition starts in {format_seconds(seconds_until_start)}"
    elif status == "live":
        message = "Exhibition is live"
    elif status == "paused":
        message = "Exhibition is temporarily paused"
    elif status == "ended":
        message = "Exhibition has ended"
    elif status == "cancelled":
        message = "Exhibition was cancelled"
    else:
        message = "Exhibition is being prepared"
    return {
        "exhibition_id": exhibition.id,
        "title": exhibition.title,
        "status": status,
        "server_time": server_time.isoformat(),
        "start_at": to_iso(exhibition.start_at),
        "end_at": to_iso(exhibition.end_at),
        "actual_started_at": to_iso(exhibition.actual_started_at),
        "seconds_until_start": seconds_until_start,
        "seconds_until_end": seconds_until_end,
        "can_user_enter": can_user_enter,
        "can_vendor_go_live": can_vendor_go_live,
        "message": message,
    }


def sync_exhibition_completion(db: Session, exhibition: Exhibition) -> None:
    countdown = status_payload(exhibition)
    if countdown["status"] != "ended" or exhibition.status in {"ended", "cancelled", "draft"}:
        return
    exhibition.status = "ended"
    exhibition.ended_at = exhibition.ended_at or now_utc()
    exhibition.updated_at = now_utc()
    stall_ids = select(Stall.id).where(Stall.exhibition_id == exhibition.id)
    live_sessions = db.scalars(select(LiveSession).where(LiveSession.stall_id.in_(stall_ids), LiveSession.status == "live")).all()
    for session in live_sessions:
        session.status = "ended"
        session.ended_at = session.ended_at or now_utc()
    stalls = db.scalars(select(Stall).where(Stall.exhibition_id == exhibition.id, Stall.live_status == "live")).all()
    for stall in stalls:
        stall.status = "assigned" if stall.vendor_id else "available"
        stall.live_status = "offline"
        stall.viewer_count = 0
    db.commit()


def serialize_exhibition(db: Session, exhibition: Exhibition) -> dict:
    sync_exhibition_completion(db, exhibition)
    countdown = status_payload(exhibition)
    stall_count = db.scalar(select(func.count(Stall.id)).where(Stall.exhibition_id == exhibition.id)) or 0
    assigned_count = db.scalar(
        select(func.count(Stall.id)).where(Stall.exhibition_id == exhibition.id, Stall.vendor_id.is_not(None))
    ) or 0
    stall_ids = select(Stall.id).where(Stall.exhibition_id == exhibition.id)
    live_count = 0
    if countdown["status"] == "live":
        live_count = db.scalar(
            select(func.count(LiveSession.id)).where(LiveSession.stall_id.in_(stall_ids), LiveSession.status == "live")
        ) or 0
    pending_requests = db.scalar(
        select(func.count(VendorExhibitionRequest.id)).where(
            VendorExhibitionRequest.exhibition_id == exhibition.id,
            VendorExhibitionRequest.status == "pending",
        )
    ) or 0
    configured_stall_count = exhibition.stall_count or stall_count
    map_template_id = getattr(exhibition, "map_template_id", None) or "deprecated-direct-marketplace"
    banner = exhibition.banner_image or "/images/home/hero-expo-bg-light.webp"
    return {
        "id": exhibition.id,
        "title": exhibition.title,
        "description": exhibition.description,
        "bannerImage": banner,
        "banner_image": banner,
        "category": exhibition.category,
        "mapTemplateId": map_template_id,
        "map_template_id": map_template_id,
        "stallCount": configured_stall_count,
        "stall_count": configured_stall_count,
        "assignedStallsCount": assigned_count,
        "pendingVendorRequests": pending_requests,
        "liveSessionsCount": live_count,
        "startDate": to_iso(exhibition.start_at),
        "endDate": to_iso(exhibition.end_at),
        "start_at": to_iso(exhibition.start_at),
        "end_at": to_iso(exhibition.end_at),
        "status": countdown["status"],
        "createdByAdminId": exhibition.created_by_admin_id,
        "created_by_admin_id": exhibition.created_by_admin_id,
        "actual_started_at": to_iso(exhibition.actual_started_at),
        "paused_at": to_iso(exhibition.paused_at),
        "ended_at": to_iso(exhibition.ended_at),
        "created_at": to_iso(exhibition.created_at),
        "updated_at": to_iso(exhibition.updated_at),
        "seconds_until_start": countdown["seconds_until_start"],
        "seconds_until_end": countdown["seconds_until_end"],
        "can_user_enter": countdown["can_user_enter"],
        "can_vendor_go_live": countdown["can_vendor_go_live"],
        "message": countdown["message"],
    }


def serialize_vendor(vendor: Vendor | None) -> dict | None:
    if vendor is None:
        return None
    return {
        "id": vendor.id,
        "userId": vendor.user_id,
        "businessName": vendor.business_name,
        "displayName": vendor.display_name,
        "phone": vendor.phone or "",
        "status": vendor.status,
        "commissionRate": vendor.commission_rate or 0,
        "image": None,
        "ownerName": vendor.owner_name,
        "email": vendor.email,
        "businessCategory": vendor.business_category,
        "productCategories": vendor.product_categories or [],
        "instagram": vendor.instagram,
        "website": vendor.website,
        "whatsapp": vendor.whatsapp,
        "businessDescription": vendor.business_description,
        "gstNumber": vendor.gst_number,
        "fssaiNumber": vendor.fssai_number,
        "panNumber": vendor.pan_number,
        "upiId": vendor.upi_id,
        "bankAccountNumber": vendor.bank_account_number,
        "ifsc": vendor.ifsc,
        "address": vendor.address,
        "city": vendor.city,
        "state": vendor.state,
        "pincode": vendor.pincode,
        "rejectionReason": vendor.rejection_reason,
        "approvedAt": to_iso(vendor.approved_at),
        "approvedByAdminId": vendor.approved_by_admin_id,
        "createdAt": to_iso(vendor.created_at),
    }


def serialize_product(product: Product | None) -> dict | None:
    if product is None:
        return None
    images = product.images if isinstance(product.images, list) else []
    return {
        "id": product.id,
        "vendorId": product.vendor_id,
        "stallId": product.stall_id,
        "title": product.title,
        "description": product.description,
        "category": product.category,
        "price": as_int(product.price),
        "compareAtPrice": as_int(product.compare_at_price) or as_int(product.price),
        "discountPrice": as_int(product.discount_price),
        "images": images or ["/products/product-placeholder.png"],
        "videoUrl": product.video_url,
        "cataloguePdfUrl": product.catalogue_pdf_url,
        "stock": product.stock,
        "status": product.status,
        "deliveryArea": product.delivery_area,
        "codAvailable": bool(product.cod_available),
        "courierCharge": as_int(product.courier_charge),
        "offerCode": product.offer_code,
    }


def serialize_stall(db: Session, stall: Stall) -> dict:
    vendor = db.get(Vendor, stall.vendor_id) if stall.vendor_id else None
    exhibition = db.get(Exhibition, stall.exhibition_id)
    active_products = db.scalar(select(func.count(Product.id)).where(Product.stall_id == stall.id, Product.status == "active")) or 0
    exhibition_status = status_payload(exhibition)["status"] if exhibition else "ended"
    live_session = None
    if exhibition_status == "live":
        live_session = db.scalar(
            select(LiveSession).where(LiveSession.stall_id == stall.id, LiveSession.status == "live").order_by(LiveSession.started_at.desc())
        )
        if live_session is not None and not is_live_session_current(live_session):
            end_stale_live_session(db, live_session, stall)
            db.commit()
            live_session = None
    display_status = stall.status
    if display_status == "live" and live_session is None:
        display_status = "assigned" if stall.vendor_id else "available"
    live_status = "live" if live_session else ("offline" if stall.live_status == "live" else (stall.live_status or "offline"))
    viewer_count = live_session.viewer_count if live_session else stall.viewer_count
    vendor_name = vendor.display_name if vendor else None
    social_links = stall.social_links or {}
    if vendor:
        social_links = {
            "instagram": social_links.get("instagram") or vendor.instagram,
            "website": social_links.get("website") or vendor.website,
            "whatsapp": social_links.get("whatsapp") or vendor.whatsapp,
        }
    placeholder = "/stalls/stall-placeholder.png"
    return {
        "id": stall.id,
        "exhibitionId": stall.exhibition_id,
        "exhibitionTitle": exhibition.title if exhibition else None,
        "vendorId": stall.vendor_id or "",
        "assignedVendorId": stall.vendor_id,
        "assignedVendorName": vendor_name,
        "name": stall.name,
        "stallCode": stall.stall_code,
        "category": stall.category,
        "mapX": getattr(stall, "map_x", None),
        "mapY": getattr(stall, "map_y", None),
        "width": getattr(stall, "width", None),
        "height": getattr(stall, "height", None),
        "stallType": stall.stall_type,
        "rentAmount": stall.rent_amount,
        "bookingStatus": stall.booking_status,
        "paymentStatus": stall.payment_status,
        "productLimit": stall.product_limit,
        "isFeatured": stall.is_featured,
        "status": display_status,
        "viewerCount": viewer_count or 0,
        "image": stall.image or placeholder,
        "bannerImage": stall.banner_image or stall.featured_image or placeholder,
        "vendorLogo": stall.vendor_logo,
        "featuredImage": stall.featured_image or stall.banner_image or placeholder,
        "number": stall.stall_code,
        "vendorName": vendor_name,
        "description": stall.description or vendor.business_description if vendor else stall.description,
        "liveStatus": live_status,
        "liveStartedAt": to_iso(live_session.started_at) if live_session else None,
        "breakMessage": stall.break_message,
        "deliveryArea": stall.delivery_area,
        "activeFrom": to_iso(stall.active_from),
        "activeTo": to_iso(stall.active_to),
        "productCount": active_products,
        "route": stall.route or f"/live/{stall.id}",
        "socialLinks": social_links,
        "createdAt": to_iso(stall.created_at),
        "updatedAt": to_iso(stall.updated_at),
    }


def generate_stalls_for_exhibition(
    db: Session,
    exhibition: Exhibition,
    stall_count: int,
    map_template_id: str | None = None,
) -> list[Stall]:
    if stall_count < 1:
        raise HTTPException(status_code=400, detail={"code": "VALIDATION_ERROR", "message": "stall_count must be at least 1."})
    stalls: list[Stall] = []
    for index in range(stall_count):
        code = stall_code_for(index)
        stall = Stall(
            id=f"{exhibition.id}-{code.lower()}",
            exhibition_id=exhibition.id,
            vendor_id=None,
            stall_code=code,
            name=f"Stall {code}",
            category=exhibition.category or "General",
            description="Available stall. Assign an approved vendor to activate this booth.",
            map_x=0,
            map_y=0,
            width=0,
            height=0,
            position_index=index,
            zone=code[0],
            is_featured=index == 0,
            stall_type="basic",
            rent_amount=999,
            booking_status="draft",
            payment_status="unpaid",
            product_limit=10,
            status="available",
            viewer_count=0,
            image="/stalls/stall-placeholder.png",
            banner_image="/stalls/stall-placeholder.png",
            featured_image="/stalls/stall-placeholder.png",
            live_status="offline",
            route=f"/live/{exhibition.id}-{code.lower()}",
            social_links={},
            assigned_at=None,
        )
        db.add(stall)
        stalls.append(stall)
    exhibition.stall_count = stall_count
    exhibition.map_template_id = "deprecated-direct-marketplace"
    return stalls


def serialize_vendor_request(db: Session, request: VendorExhibitionRequest) -> dict:
    vendor = db.get(Vendor, request.vendor_id)
    return {
        "id": request.id,
        "exhibition_id": request.exhibition_id,
        "vendor_id": request.vendor_id,
        "status": request.status,
        "message": request.message,
        "admin_note": request.admin_note,
        "requested_at": to_iso(request.requested_at),
        "reviewed_at": to_iso(request.reviewed_at),
        "reviewed_by_admin_id": request.reviewed_by_admin_id,
        "vendor": serialize_vendor(vendor),
        "vendorName": vendor.display_name if vendor else request.vendor_id,
        "businessCategory": vendor.business_category if vendor else None,
    }


def serialize_live_session(db: Session, session: LiveSession) -> dict:
    pinned = db.get(Product, session.pinned_product_id) if session.pinned_product_id else None
    return {
        "id": session.id,
        "stallId": session.stall_id,
        "stall_id": session.stall_id,
        "vendorId": session.vendor_id,
        "vendor_id": session.vendor_id,
        "livekitRoomName": session.livekit_room_name,
        "livekit_room_name": session.livekit_room_name,
        "status": session.status,
        "stream_mode": session.stream_mode,
        "camera_enabled": bool(session.camera_enabled),
        "rtmp_url": session.rtmp_url,
        "stream_key": session.stream_key,
        "token_mode": session.token_mode,
        "pinnedProductId": session.pinned_product_id,
        "pinned_product_id": session.pinned_product_id,
        "pinned_product": serialize_product(pinned) if pinned else None,
        "viewerCount": session.viewer_count,
        "viewer_count": session.viewer_count,
        "likesCount": session.likes_count or 0,
        "likes_count": session.likes_count or 0,
        "followCount": session.follow_count or 0,
        "follow_count": session.follow_count or 0,
        "started_at": to_iso(session.started_at),
        "ended_at": to_iso(session.ended_at),
    }


def serialize_message(message: LiveChatMessage) -> dict:
    return {
        "id": message.id,
        "liveSessionId": message.live_session_id,
        "senderId": message.sender_id,
        "senderName": message.sender_name,
        "senderRole": message.sender_role,
        "message": message.message,
        "messageType": message.message_type,
        "productId": message.product_id,
        "offeredPrice": as_int(message.offered_price),
        "offerStatus": message.offer_status,
        "createdAt": to_iso(message.created_at),
    }


def serialize_order(db: Session, order: Order) -> dict:
    items = db.scalars(select(OrderItem).where(OrderItem.order_id == order.id)).all()
    customer = db.get(User, order.user_id)
    serialized_items = []
    first_product: Product | None = None
    first_vendor: Vendor | None = None
    for item in items:
        product = db.get(Product, item.product_id)
        vendor = db.get(Vendor, item.vendor_id)
        if first_product is None:
            first_product = product
        if first_vendor is None:
            first_vendor = vendor
        serialized_items.append({
            "id": item.id,
            "vendorId": item.vendor_id,
            "productId": item.product_id,
            "quantity": item.quantity,
            "unitPrice": as_int(item.unit_price),
            "totalPrice": as_int(item.total_price),
            "title": product.title if product else "Deleted product",
            "vendorName": vendor.display_name if vendor else "Vendor unavailable",
            "image": ((product.images or ["/products/product-placeholder.png"])[0] if product else "/products/product-placeholder.png"),
        })
    first_stall = db.get(Stall, first_product.stall_id) if first_product else None
    return {
        "id": order.id,
        "userId": order.user_id,
        "exhibitionId": first_stall.exhibition_id if first_stall else "",
        "stallId": first_product.stall_id if first_product else "",
        "vendorId": first_vendor.id if first_vendor else "",
        "totalAmount": as_int(order.total_amount),
        "discountAmount": as_int(order.discount_amount),
        "courierCharge": as_int(order.courier_charge),
        "gst": as_int(order.gst_amount),
        "commissionAmount": as_int(order.commission_amount),
        "vendorPayoutAmount": as_int(order.vendor_payout_amount),
        "paymentStatus": order.payment_status,
        "orderStatus": order.order_status,
        "createdAt": to_iso(order.created_at),
        "shippingAddress": order.shipping_address,
        "shippingMapUrl": order.shipping_map_url,
        "trackingNumber": order.tracking_number,
        "packagePhotoUrl": order.package_photo_url,
        "fulfilledAt": to_iso(order.fulfilled_at),
        "customerName": customer.name if customer else None,
        "customerEmail": customer.email if customer else None,
        "customerPhone": customer.phone if customer else None,
        "items": serialized_items,
        "vendorName": first_vendor.display_name if first_vendor else "Vendor unavailable",
        "estimatedDelivery": to_iso(order.created_at + timedelta(days=5)) if order.created_at else "Expected in 3-5 days",
    }


def format_seconds(total_seconds: int) -> str:
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
