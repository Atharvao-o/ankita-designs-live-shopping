from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.subscription import LiveSlot, SubscriptionPlan, VendorSubscription
from app.models.vendor import Vendor
from app.schemas.subscription import (
    AdminLiveSlotCreate,
    AdminLiveSlotReview,
    AdminSubscriptionReview,
    LiveSlotPaymentProof,
    LiveSlotRequest,
    VendorSubscriptionPaymentProof,
    VendorSubscriptionRequest,
)
from app.services.auth_context import current_user_from_request
from app.services.subscription_service import (
    approve_live_slot,
    approve_vendor_subscription,
    cancel_live_slot,
    cancel_vendor_subscription,
    get_vendor_live_access_status,
    get_vendor_live_slots,
    list_active_plans,
    public_live_schedule,
    reject_live_slot,
    reject_vendor_subscription,
    request_live_slot,
    request_vendor_subscription,
    serialize_live_slot,
    serialize_plan,
    serialize_subscription,
    submit_live_slot_payment_proof,
    submit_subscription_payment_proof,
    vendor_subscription_status,
)

router = APIRouter(tags=["subscriptions"])


def require_user(request: Request, db: Session):
    user = current_user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Login required."})
    return user


def require_vendor(request: Request, db: Session) -> Vendor:
    user = require_user(request, db)
    if user.role != "vendor":
        raise HTTPException(status_code=403, detail={"code": "VENDOR_REQUIRED", "message": "Vendor account required."})
    vendor = db.scalar(select(Vendor).where(Vendor.user_id == user.id))
    if vendor is None:
        raise HTTPException(status_code=404, detail={"code": "VENDOR_NOT_FOUND", "message": "Vendor profile not found."})
    return vendor


def require_admin(request: Request, db: Session):
    user = require_user(request, db)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail={"code": "ADMIN_REQUIRED", "message": "Admin account required."})
    return user


@router.get("/subscription/plans")
def get_subscription_plans(db: Session = Depends(get_db)) -> list[dict]:
    return [serialize_plan(plan) for plan in list_active_plans(db)]


@router.get("/live/schedule")
def get_live_schedule(db: Session = Depends(get_db)) -> list[dict]:
    return public_live_schedule(db)


@router.get("/vendor/subscription")
def get_vendor_subscription(request: Request, db: Session = Depends(get_db)) -> dict:
    vendor = require_vendor(request, db)
    return vendor_subscription_status(db, vendor.id)


@router.post("/vendor/subscription/request")
def create_vendor_subscription_request(
    payload: VendorSubscriptionRequest,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    vendor = require_vendor(request, db)
    return serialize_subscription(db, request_vendor_subscription(db, vendor, payload.planId))


@router.patch("/vendor/subscription/payment-proof")
def submit_vendor_subscription_proof(
    payload: VendorSubscriptionPaymentProof,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    vendor = require_vendor(request, db)
    subscription = submit_subscription_payment_proof(
        db,
        vendor,
        payload.subscriptionId,
        payload.paymentProofUrl,
        payload.paymentReference,
    )
    return serialize_subscription(db, subscription)


@router.get("/vendor/live-slots")
def get_vendor_slots(request: Request, db: Session = Depends(get_db)) -> list[dict]:
    vendor = require_vendor(request, db)
    return [serialize_live_slot(db, slot) for slot in get_vendor_live_slots(db, vendor.id)]


@router.post("/vendor/live-slots/request")
def create_vendor_live_slot_request(payload: LiveSlotRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    vendor = require_vendor(request, db)
    return serialize_live_slot(db, request_live_slot(db, vendor, payload))


@router.patch("/vendor/live-slots/{slot_id}/payment-proof")
def submit_vendor_live_slot_proof(
    slot_id: str,
    payload: LiveSlotPaymentProof,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    vendor = require_vendor(request, db)
    return serialize_live_slot(db, submit_live_slot_payment_proof(db, vendor, slot_id, payload.paymentProofUrl, payload.paymentReference))


@router.patch("/vendor/live-slots/{slot_id}/cancel")
def cancel_vendor_live_slot(slot_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    vendor = require_vendor(request, db)
    user = require_user(request, db)
    return serialize_live_slot(db, cancel_live_slot(db, slot_id, user.id, vendor_id=vendor.id))


@router.get("/vendor/live-access")
def get_vendor_live_access(request: Request, stall_id: str | None = None, db: Session = Depends(get_db)) -> dict:
    vendor = require_vendor(request, db)
    stall = None
    if stall_id:
        from app.models.stall import Stall

        stall = db.get(Stall, stall_id)
    else:
        from app.routes.vendor import get_assigned_vendor_stall

        stall = get_assigned_vendor_stall(db, vendor)
    return get_vendor_live_access_status(db, vendor, stall)


@router.get("/admin/subscriptions")
def get_admin_subscriptions(
    request: Request,
    status: str | None = None,
    payment_status: str | None = None,
    vendor_id: str | None = None,
    plan_id: str | None = None,
    db: Session = Depends(get_db),
) -> list[dict]:
    require_admin(request, db)
    query = select(VendorSubscription).order_by(VendorSubscription.created_at.desc())
    if status and status != "all":
        query = query.where(VendorSubscription.status == status)
    if payment_status and payment_status != "all":
        query = query.where(VendorSubscription.payment_status == payment_status)
    if vendor_id:
        query = query.where(VendorSubscription.vendor_id == vendor_id)
    if plan_id:
        query = query.where(VendorSubscription.plan_id == plan_id)
    return [serialize_subscription(db, item) for item in db.scalars(query).all()]


@router.patch("/admin/subscriptions/{subscription_id}/approve")
def approve_admin_subscription(subscription_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    admin = require_admin(request, db)
    return serialize_subscription(db, approve_vendor_subscription(db, subscription_id, admin.id))


@router.patch("/admin/subscriptions/{subscription_id}/reject")
def reject_admin_subscription(
    subscription_id: str,
    payload: AdminSubscriptionReview,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    admin = require_admin(request, db)
    return serialize_subscription(db, reject_vendor_subscription(db, subscription_id, admin.id, payload.rejectionReason or ""))


@router.patch("/admin/subscriptions/{subscription_id}/cancel")
def cancel_admin_subscription(subscription_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    admin = require_admin(request, db)
    return serialize_subscription(db, cancel_vendor_subscription(db, subscription_id, admin.id))


@router.get("/admin/live-slots")
def get_admin_live_slots(
    request: Request,
    status: str | None = None,
    vendor_id: str | None = None,
    exhibition_id: str | None = None,
    payment_status: str | None = None,
    db: Session = Depends(get_db),
) -> list[dict]:
    require_admin(request, db)
    query = select(LiveSlot).order_by(LiveSlot.start_time.desc())
    if status and status != "all":
        query = query.where(LiveSlot.status == status)
    if vendor_id:
        query = query.where(LiveSlot.vendor_id == vendor_id)
    if exhibition_id:
        query = query.where(LiveSlot.exhibition_id == exhibition_id)
    if payment_status and payment_status != "all":
        query = query.where(LiveSlot.payment_status == payment_status)
    return [serialize_live_slot(db, item) for item in db.scalars(query).all()]


@router.post("/admin/live-slots")
def create_admin_live_slot(payload: AdminLiveSlotCreate, request: Request, db: Session = Depends(get_db)) -> dict:
    admin = require_admin(request, db)
    vendor = db.get(Vendor, payload.vendorId)
    if vendor is None:
        raise HTTPException(status_code=404, detail={"code": "VENDOR_NOT_FOUND", "message": "Vendor not found."})
    slot = request_live_slot(db, vendor, payload)
    slot.slot_type = "admin_assigned"
    slot.payment_status = "not_required"
    db.commit()
    db.refresh(slot)
    return serialize_live_slot(db, approve_live_slot(db, slot.id, admin.id))


@router.patch("/admin/live-slots/{slot_id}/approve")
def approve_admin_live_slot(slot_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    admin = require_admin(request, db)
    return serialize_live_slot(db, approve_live_slot(db, slot_id, admin.id))


@router.patch("/admin/live-slots/{slot_id}/reject")
def reject_admin_live_slot(
    slot_id: str,
    payload: AdminLiveSlotReview,
    request: Request,
    db: Session = Depends(get_db),
) -> dict:
    admin = require_admin(request, db)
    return serialize_live_slot(db, reject_live_slot(db, slot_id, admin.id, payload.rejectionReason or ""))


@router.patch("/admin/live-slots/{slot_id}/cancel")
def cancel_admin_live_slot(slot_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    admin = require_admin(request, db)
    return serialize_live_slot(db, cancel_live_slot(db, slot_id, admin.id))
