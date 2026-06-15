from __future__ import annotations

from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.exhibition import Exhibition
from app.models.product import Product
from app.models.stall import Stall
from app.models.subscription import LiveSlot, SubscriptionPlan, VendorSubscription
from app.models.vendor import Vendor
from app.services.db_data_service import status_payload, to_iso


SUBSCRIPTION_STATUSES = {"pending_payment", "active", "expired", "cancelled", "rejected"}
SUBSCRIPTION_PAYMENT_STATUSES = {"unpaid", "submitted", "verified", "rejected"}
LIVE_SLOT_TYPES = {"subscription", "exhibition", "paid_extra", "admin_assigned"}
LIVE_SLOT_STATUSES = {"requested", "approved", "rejected", "cancelled", "completed", "expired"}
LIVE_SLOT_PAYMENT_STATUSES = {"not_required", "unpaid", "submitted", "verified", "rejected"}
LIVE_SLOT_GRACE_MINUTES = 15
SUBSCRIPTION_OPTIONAL_SLOT_TYPES = {"admin_assigned", "exhibition"}


def now_utc() -> datetime:
    return datetime.utcnow()


def parse_datetime(value: str | datetime) -> datetime:
    if isinstance(value, datetime):
        return value.replace(tzinfo=None) if value.tzinfo else value
    normalized = value.strip()
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"code": "INVALID_DATETIME", "message": "Use ISO date/time values."}) from exc
    return parsed.replace(tzinfo=None) if parsed.tzinfo else parsed


def money(value: object) -> float:
    return float(value or 0)


def has_uploaded_brand_asset(value: str | None) -> bool:
    if not value:
        return False
    normalized = value.strip()
    return bool(normalized) and "stall-placeholder" not in normalized


def live_slot_enforcement_enabled() -> bool:
    return bool(get_settings().enforce_live_slot_gating)


def serialize_plan(plan: SubscriptionPlan | None) -> dict | None:
    if plan is None:
        return None
    return {
        "id": plan.id,
        "name": plan.name,
        "description": plan.description,
        "price": money(plan.price),
        "durationDays": plan.duration_days,
        "productLimit": plan.product_limit,
        "postLimit": plan.post_limit,
        "liveSlotLimit": plan.live_slot_limit,
        "exhibitionJoinLimit": plan.exhibition_join_limit,
        "adCreditLimit": plan.ad_credit_limit,
        "priorityLevel": plan.priority_level,
        "analyticsEnabled": plan.analytics_enabled,
        "isActive": plan.is_active,
        "createdAt": to_iso(plan.created_at),
        "updatedAt": to_iso(plan.updated_at),
    }


def serialize_subscription(db: Session, subscription: VendorSubscription | None) -> dict | None:
    if subscription is None:
        return None
    vendor = db.get(Vendor, subscription.vendor_id)
    return {
        "id": subscription.id,
        "vendorId": subscription.vendor_id,
        "planId": subscription.plan_id,
        "plan": serialize_plan(db.get(SubscriptionPlan, subscription.plan_id)),
        "vendorName": vendor.display_name if vendor else None,
        "status": subscription.status,
        "paymentStatus": subscription.payment_status,
        "paymentReference": subscription.payment_reference,
        "paymentProofUrl": subscription.payment_proof_url,
        "startsAt": to_iso(subscription.starts_at),
        "endsAt": to_iso(subscription.ends_at),
        "approvedByAdminId": subscription.approved_by_admin_id,
        "rejectionReason": subscription.rejection_reason,
        "createdAt": to_iso(subscription.created_at),
        "updatedAt": to_iso(subscription.updated_at),
    }


def serialize_live_slot(db: Session, slot: LiveSlot | None) -> dict | None:
    if slot is None:
        return None
    vendor = db.get(Vendor, slot.vendor_id)
    exhibition = db.get(Exhibition, slot.exhibition_id) if slot.exhibition_id else None
    stall = db.get(Stall, slot.stall_id) if slot.stall_id else None
    return {
        "id": slot.id,
        "vendorId": slot.vendor_id,
        "vendorName": vendor.display_name if vendor else None,
        "exhibitionId": slot.exhibition_id,
        "exhibitionTitle": exhibition.title if exhibition else None,
        "stallId": slot.stall_id,
        "stallName": stall.name if stall else None,
        "slotType": slot.slot_type,
        "title": slot.title,
        "startTime": to_iso(slot.start_time),
        "endTime": to_iso(slot.end_time),
        "status": slot.status,
        "paymentStatus": slot.payment_status,
        "paymentProofUrl": slot.payment_proof_url,
        "price": money(slot.price),
        "approvedByAdminId": slot.approved_by_admin_id,
        "rejectionReason": slot.rejection_reason,
        "createdAt": to_iso(slot.created_at),
        "updatedAt": to_iso(slot.updated_at),
    }


def get_active_vendor_subscription(db: Session, vendor_id: str) -> VendorSubscription | None:
    timestamp = now_utc()
    return db.scalar(
        select(VendorSubscription)
        .where(
            VendorSubscription.vendor_id == vendor_id,
            VendorSubscription.status == "active",
            VendorSubscription.payment_status == "verified",
            or_(VendorSubscription.starts_at.is_(None), VendorSubscription.starts_at <= timestamp),
            or_(VendorSubscription.ends_at.is_(None), VendorSubscription.ends_at >= timestamp),
        )
        .order_by(VendorSubscription.ends_at.desc().nulls_last(), VendorSubscription.created_at.desc())
    )


def get_current_vendor_plan(db: Session, vendor_id: str) -> SubscriptionPlan | None:
    subscription = get_active_vendor_subscription(db, vendor_id)
    return db.get(SubscriptionPlan, subscription.plan_id) if subscription else None


def list_active_plans(db: Session) -> list[SubscriptionPlan]:
    return db.scalars(select(SubscriptionPlan).where(SubscriptionPlan.is_active.is_(True)).order_by(SubscriptionPlan.priority_level.asc(), SubscriptionPlan.price.asc())).all()


def request_vendor_subscription(db: Session, vendor: Vendor, plan_id: str) -> VendorSubscription:
    plan = db.get(SubscriptionPlan, plan_id)
    if plan is None or not plan.is_active:
        raise HTTPException(status_code=404, detail={"code": "PLAN_NOT_FOUND", "message": "Subscription plan not found."})
    existing = db.scalar(
        select(VendorSubscription)
        .where(
            VendorSubscription.vendor_id == vendor.id,
            VendorSubscription.plan_id == plan_id,
            VendorSubscription.status == "pending_payment",
        )
        .order_by(VendorSubscription.created_at.desc())
    )
    if existing:
        return existing
    subscription = VendorSubscription(
        id=str(uuid4()),
        vendor_id=vendor.id,
        plan_id=plan_id,
        status="pending_payment",
        payment_status="verified" if money(plan.price) == 0 else "unpaid",
        starts_at=None,
        ends_at=None,
        rejection_reason=None,
    )
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    return subscription


def submit_subscription_payment_proof(db: Session, vendor: Vendor, subscription_id: str, proof_url: str, reference: str | None) -> VendorSubscription:
    subscription = db.get(VendorSubscription, subscription_id)
    if subscription is None or subscription.vendor_id != vendor.id:
        raise HTTPException(status_code=404, detail={"code": "SUBSCRIPTION_NOT_FOUND", "message": "Subscription request not found."})
    if subscription.status in {"active", "cancelled", "rejected", "expired"}:
        raise HTTPException(status_code=400, detail={"code": "SUBSCRIPTION_CLOSED", "message": "This subscription request can no longer accept payment proof."})
    subscription.payment_proof_url = proof_url.strip()
    subscription.payment_reference = (reference or "").strip() or None
    subscription.payment_status = "submitted"
    subscription.updated_at = now_utc()
    db.commit()
    db.refresh(subscription)
    return subscription


def approve_vendor_subscription(db: Session, subscription_id: str, admin_id: str) -> VendorSubscription:
    subscription = db.get(VendorSubscription, subscription_id)
    if subscription is None:
        raise HTTPException(status_code=404, detail={"code": "SUBSCRIPTION_NOT_FOUND", "message": "Subscription request not found."})
    plan = db.get(SubscriptionPlan, subscription.plan_id)
    if plan is None:
        raise HTTPException(status_code=400, detail={"code": "PLAN_NOT_FOUND", "message": "Linked plan no longer exists."})
    timestamp = now_utc()
    active_subscriptions = db.scalars(
        select(VendorSubscription).where(
            VendorSubscription.vendor_id == subscription.vendor_id,
            VendorSubscription.id != subscription.id,
            VendorSubscription.status == "active",
        )
    ).all()
    for active in active_subscriptions:
        active.status = "cancelled"
        active.updated_at = timestamp
    subscription.status = "active"
    subscription.payment_status = "verified"
    subscription.starts_at = timestamp
    subscription.ends_at = timestamp + timedelta(days=plan.duration_days)
    subscription.approved_by_admin_id = admin_id
    subscription.rejection_reason = None
    subscription.updated_at = timestamp
    db.commit()
    db.refresh(subscription)
    return subscription


def reject_vendor_subscription(db: Session, subscription_id: str, admin_id: str, reason: str) -> VendorSubscription:
    if not reason.strip():
        raise HTTPException(status_code=400, detail={"code": "REJECTION_REASON_REQUIRED", "message": "Add a rejection reason."})
    subscription = db.get(VendorSubscription, subscription_id)
    if subscription is None:
        raise HTTPException(status_code=404, detail={"code": "SUBSCRIPTION_NOT_FOUND", "message": "Subscription request not found."})
    subscription.status = "rejected"
    subscription.payment_status = "rejected"
    subscription.approved_by_admin_id = admin_id
    subscription.rejection_reason = reason.strip()
    subscription.updated_at = now_utc()
    db.commit()
    db.refresh(subscription)
    return subscription


def cancel_vendor_subscription(db: Session, subscription_id: str, admin_id: str) -> VendorSubscription:
    subscription = db.get(VendorSubscription, subscription_id)
    if subscription is None:
        raise HTTPException(status_code=404, detail={"code": "SUBSCRIPTION_NOT_FOUND", "message": "Subscription request not found."})
    subscription.status = "cancelled"
    subscription.approved_by_admin_id = admin_id
    subscription.updated_at = now_utc()
    db.commit()
    db.refresh(subscription)
    return subscription


def get_vendor_live_slots(db: Session, vendor_id: str) -> list[LiveSlot]:
    return db.scalars(select(LiveSlot).where(LiveSlot.vendor_id == vendor_id).order_by(LiveSlot.start_time.desc())).all()


def check_slot_overlap(db: Session, vendor_id: str, start_time: datetime, end_time: datetime, exclude_id: str | None = None) -> LiveSlot | None:
    query = select(LiveSlot).where(
        LiveSlot.vendor_id == vendor_id,
        LiveSlot.status == "approved",
        LiveSlot.start_time < end_time,
        LiveSlot.end_time > start_time,
    )
    if exclude_id:
        query = query.where(LiveSlot.id != exclude_id)
    return db.scalar(query.order_by(LiveSlot.start_time.asc()))


def validate_live_slot_payload(db: Session, vendor: Vendor, payload: object) -> tuple[datetime, datetime, str, str | None, str | None, float]:
    start_time = parse_datetime(getattr(payload, "startTime"))
    end_time = parse_datetime(getattr(payload, "endTime"))
    if end_time <= start_time:
        raise HTTPException(status_code=400, detail={"code": "INVALID_SLOT_TIME", "message": "End time must be after start time."})
    slot_type = getattr(payload, "slotType")
    if slot_type not in LIVE_SLOT_TYPES:
        raise HTTPException(status_code=400, detail={"code": "INVALID_SLOT_TYPE", "message": "Choose a valid live slot type."})
    exhibition_id = getattr(payload, "exhibitionId", None)
    if exhibition_id and db.get(Exhibition, exhibition_id) is None:
        raise HTTPException(status_code=400, detail={"code": "EXHIBITION_NOT_FOUND", "message": "Linked exhibition not found."})
    stall_id = getattr(payload, "stallId", None)
    if stall_id:
        stall = db.get(Stall, stall_id)
        if stall is None or stall.vendor_id != vendor.id:
            raise HTTPException(status_code=400, detail={"code": "STALL_NOT_ASSIGNED", "message": "Linked stall must belong to this vendor."})
    price = max(0, money(getattr(payload, "price", 0)))
    return start_time, end_time, slot_type, exhibition_id, stall_id, price


def request_live_slot(db: Session, vendor: Vendor, payload: object) -> LiveSlot:
    start_time, end_time, slot_type, exhibition_id, stall_id, price = validate_live_slot_payload(db, vendor, payload)
    slot = LiveSlot(
        id=str(uuid4()),
        vendor_id=vendor.id,
        exhibition_id=exhibition_id,
        stall_id=stall_id,
        slot_type=slot_type,
        title=(getattr(payload, "title", None) or "").strip() or None,
        start_time=start_time,
        end_time=end_time,
        status="requested",
        payment_status="unpaid" if price > 0 else "not_required",
        price=price,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


def submit_live_slot_payment_proof(db: Session, vendor: Vendor, slot_id: str, proof_url: str, reference: str | None = None) -> LiveSlot:
    slot = db.get(LiveSlot, slot_id)
    if slot is None or slot.vendor_id != vendor.id:
        raise HTTPException(status_code=404, detail={"code": "LIVE_SLOT_NOT_FOUND", "message": "Live slot request not found."})
    if slot.status not in {"requested", "rejected"}:
        raise HTTPException(status_code=400, detail={"code": "LIVE_SLOT_CLOSED", "message": "This live slot can no longer accept payment proof."})
    slot.payment_proof_url = proof_url.strip()
    slot.payment_status = "submitted"
    slot.updated_at = now_utc()
    db.commit()
    db.refresh(slot)
    return slot


def approve_live_slot(db: Session, slot_id: str, admin_id: str) -> LiveSlot:
    slot = db.get(LiveSlot, slot_id)
    if slot is None:
        raise HTTPException(status_code=404, detail={"code": "LIVE_SLOT_NOT_FOUND", "message": "Live slot request not found."})
    overlap = check_slot_overlap(db, slot.vendor_id, slot.start_time, slot.end_time, exclude_id=slot.id)
    if overlap:
        raise HTTPException(status_code=409, detail={"code": "SLOT_OVERLAP", "message": "This vendor already has an approved slot in that time window."})
    slot.status = "approved"
    slot.payment_status = "not_required" if money(slot.price) == 0 else "verified"
    slot.approved_by_admin_id = admin_id
    slot.rejection_reason = None
    slot.updated_at = now_utc()
    db.commit()
    db.refresh(slot)
    return slot


def reject_live_slot(db: Session, slot_id: str, admin_id: str, reason: str) -> LiveSlot:
    if not reason.strip():
        raise HTTPException(status_code=400, detail={"code": "REJECTION_REASON_REQUIRED", "message": "Add a rejection reason."})
    slot = db.get(LiveSlot, slot_id)
    if slot is None:
        raise HTTPException(status_code=404, detail={"code": "LIVE_SLOT_NOT_FOUND", "message": "Live slot request not found."})
    slot.status = "rejected"
    slot.payment_status = "rejected"
    slot.rejection_reason = reason.strip()
    slot.approved_by_admin_id = admin_id
    slot.updated_at = now_utc()
    db.commit()
    db.refresh(slot)
    return slot


def cancel_live_slot(db: Session, slot_id: str, actor_id: str, vendor_id: str | None = None) -> LiveSlot:
    slot = db.get(LiveSlot, slot_id)
    if slot is None or (vendor_id is not None and slot.vendor_id != vendor_id):
        raise HTTPException(status_code=404, detail={"code": "LIVE_SLOT_NOT_FOUND", "message": "Live slot request not found."})
    if vendor_id is not None and slot.status not in {"requested", "rejected"}:
        raise HTTPException(status_code=400, detail={"code": "LIVE_SLOT_CANNOT_CANCEL", "message": "Only pending or rejected slots can be cancelled by vendor."})
    slot.status = "cancelled"
    slot.approved_by_admin_id = actor_id if vendor_id is None else slot.approved_by_admin_id
    slot.updated_at = now_utc()
    db.commit()
    db.refresh(slot)
    return slot


def get_approved_live_slot_for_now(db: Session, vendor_id: str, stall_id: str | None = None) -> LiveSlot | None:
    timestamp = now_utc()
    grace = timedelta(minutes=LIVE_SLOT_GRACE_MINUTES)
    query = select(LiveSlot).where(
        LiveSlot.vendor_id == vendor_id,
        LiveSlot.status == "approved",
        LiveSlot.start_time <= timestamp + grace,
        LiveSlot.end_time >= timestamp - grace,
        LiveSlot.payment_status.in_(["verified", "not_required"]),
    )
    if stall_id:
        query = query.where(or_(LiveSlot.stall_id.is_(None), LiveSlot.stall_id == stall_id))
    return db.scalar(query.order_by(LiveSlot.start_time.asc()))


def next_approved_live_slot(db: Session, vendor_id: str) -> LiveSlot | None:
    return db.scalar(
        select(LiveSlot)
        .where(LiveSlot.vendor_id == vendor_id, LiveSlot.status == "approved", LiveSlot.end_time >= now_utc())
        .order_by(LiveSlot.start_time.asc())
    )


def active_product_count(db: Session, vendor_id: str) -> int:
    return db.scalar(select(func.count(Product.id)).where(Product.vendor_id == vendor_id, Product.status == "active")) or 0


def get_live_slot_blocking_code(db: Session, vendor_id: str, stall_id: str | None = None) -> tuple[str, str]:
    timestamp = now_utc()
    approved = db.scalars(
        select(LiveSlot)
        .where(LiveSlot.vendor_id == vendor_id, LiveSlot.status == "approved")
        .order_by(LiveSlot.start_time.asc())
    ).all()
    if not approved:
        return "NO_APPROVED_LIVE_SLOT", "No approved live slot is available for this vendor."
    matching = [slot for slot in approved if not stall_id or slot.stall_id in {None, stall_id}]
    if not matching:
        return "NO_APPROVED_LIVE_SLOT", "No approved live slot is linked to this stall."
    if any(slot.payment_status not in {"verified", "not_required"} for slot in matching):
        return "SLOT_PAYMENT_NOT_VERIFIED", "Live slot payment is not verified yet."
    if all(slot.start_time > timestamp + timedelta(minutes=LIVE_SLOT_GRACE_MINUTES) for slot in matching):
        return "LIVE_SLOT_NOT_STARTED", "Your approved live slot starts later."
    if all(slot.end_time < timestamp - timedelta(minutes=LIVE_SLOT_GRACE_MINUTES) for slot in matching):
        return "LIVE_SLOT_EXPIRED", "Your approved live slot window has expired."
    return "NO_APPROVED_LIVE_SLOT", "No approved live slot is available right now."


def get_vendor_live_access_status(db: Session, vendor: Vendor, stall: Stall | None = None) -> dict:
    enforcement = live_slot_enforcement_enabled()
    warnings: list[str] = []
    blocking_code: str | None = None
    message = "Live access checks passed."
    strict_can_go_live = True

    if vendor.status != "approved":
        blocking_code = "VENDOR_NOT_APPROVED"
        message = "Your vendor account must be approved before going live."
        strict_can_go_live = False
    elif stall is None:
        blocking_code = "STALL_NOT_ASSIGNED"
        message = "A vendor stall assignment is required before going live."
        strict_can_go_live = False
    elif stall.vendor_id != vendor.id:
        blocking_code = "STALL_NOT_ASSIGNED"
        message = "This stall is not assigned to your vendor account."
        strict_can_go_live = False
    elif not has_uploaded_brand_asset(stall.banner_image) or not has_uploaded_brand_asset(stall.vendor_logo):
        blocking_code = "STALL_BRANDING_REQUIRED"
        message = "Upload a stall banner and vendor logo before going live."
        strict_can_go_live = False
    elif active_product_count(db, vendor.id) < 2:
        blocking_code = "NO_ACTIVE_PRODUCTS"
        message = "Add at least 2 active products before going live."
        strict_can_go_live = False

    active_slot = get_approved_live_slot_for_now(db, vendor.id, stall.id if stall else None) if stall else None
    active_subscription = get_active_vendor_subscription(db, vendor.id)
    subscription_required = active_slot is None or active_slot.slot_type not in SUBSCRIPTION_OPTIONAL_SLOT_TYPES

    if strict_can_go_live:
        if active_slot is None:
            code, slot_message = get_live_slot_blocking_code(db, vendor.id, stall.id if stall else None)
            blocking_code = code
            message = slot_message
            warnings.append(slot_message)
            strict_can_go_live = False
        elif subscription_required and active_subscription is None:
            blocking_code = "NO_ACTIVE_SUBSCRIPTION"
            message = "An active subscription is required for this live slot."
            warnings.append(message)
            strict_can_go_live = False
        elif active_slot.payment_status not in {"verified", "not_required"}:
            blocking_code = "SLOT_PAYMENT_NOT_VERIFIED"
            message = "Live slot payment is not verified yet."
            warnings.append(message)
            strict_can_go_live = False
        elif active_slot.exhibition_id:
            exhibition = db.get(Exhibition, active_slot.exhibition_id)
            exhibition_status = status_payload(exhibition)["status"] if exhibition else "ended"
            if exhibition_status != "live":
                blocking_code = "EXHIBITION_NOT_LIVE"
                message = "The linked exhibition is not live right now."
                warnings.append(message)
                strict_can_go_live = False

    if not enforcement and blocking_code in {"NO_ACTIVE_SUBSCRIPTION", "NO_APPROVED_LIVE_SLOT", "LIVE_SLOT_NOT_STARTED", "LIVE_SLOT_EXPIRED", "SLOT_PAYMENT_NOT_VERIFIED"}:
        warnings.append("Live slot enforcement is currently in rollout mode.")

    return {
        "canGoLive": strict_can_go_live,
        "enforcementEnabled": enforcement,
        "blockingCode": blocking_code,
        "message": message,
        "activeSubscription": serialize_subscription(db, active_subscription),
        "activeSlot": serialize_live_slot(db, active_slot),
        "warnings": list(dict.fromkeys(warnings)),
    }


def public_live_schedule(db: Session) -> list[dict]:
    slots = db.scalars(
        select(LiveSlot)
        .join(Vendor, Vendor.id == LiveSlot.vendor_id)
        .where(
            LiveSlot.status == "approved",
            LiveSlot.end_time >= now_utc(),
            LiveSlot.payment_status.in_(["verified", "not_required"]),
            Vendor.status == "approved",
        )
        .order_by(LiveSlot.start_time.asc())
        .limit(80)
    ).all()
    return [serialize_live_slot(db, slot) for slot in slots]


def vendor_subscription_status(db: Session, vendor_id: str) -> dict:
    history = db.scalars(
        select(VendorSubscription).where(VendorSubscription.vendor_id == vendor_id).order_by(VendorSubscription.created_at.desc())
    ).all()
    current = get_active_vendor_subscription(db, vendor_id)
    return {
        "currentSubscription": serialize_subscription(db, current),
        "latestSubscription": serialize_subscription(db, history[0] if history else None),
        "history": [serialize_subscription(db, item) for item in history],
        "plans": [serialize_plan(plan) for plan in list_active_plans(db)],
    }
