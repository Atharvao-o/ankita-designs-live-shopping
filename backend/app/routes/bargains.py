from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.bargain import BargainAcceptGroupRequest, BargainCounterRequest, BargainOfferRequest, BargainSessionCreateRequest
from app.services.auth_context import current_user_from_request
from app.services import bargain_service

router = APIRouter(tags=["bargains"])


def require_user(request: Request, db: Session):
    user = current_user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Login required."})
    return user


@router.get("/bargains/live/{live_session_id}")
def get_bargain_state(live_session_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    user = current_user_from_request(request, db)
    return bargain_service.state_payload(db, live_session_id, user)


@router.post("/vendor/bargains/start")
def start_vendor_bargain(payload: BargainSessionCreateRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    user = require_user(request, db)
    if user.role != "vendor":
        raise HTTPException(status_code=403, detail={"code": "VENDOR_REQUIRED", "message": "Vendor account required."})
    from app.routes.vendor import current_vendor_or_401, assert_vendor_approved

    vendor = current_vendor_or_401(request, db)
    assert_vendor_approved(vendor)
    session = bargain_service.start_session(
        db,
        vendor_id=vendor.id,
        live_session_id=payload.liveSessionId,
        product_id=payload.productId,
        base_price=payload.basePrice,
        selling_price=payload.sellingPrice,
        min_visible_offer=payload.minVisibleOffer,
        offer_step=payload.offerStep,
        quantity_limit=payload.quantityLimit,
        duration_minutes=payload.durationMinutes,
    )
    return bargain_service.state_payload(db, session.live_session_id, user)


@router.post("/bargains/{session_id}/offer")
def place_bargain_offer(session_id: str, payload: BargainOfferRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    user = require_user(request, db)
    if user.role != "user":
        raise HTTPException(status_code=403, detail={"code": "CUSTOMER_REQUIRED", "message": "Customer account required for bargaining."})
    bargain_service.place_offer(db, session_id=session_id, customer=user, offer_price=payload.offerPrice)
    session = db.get(bargain_service.BargainSession, session_id)
    return bargain_service.state_payload(db, session.live_session_id if session else "", user)


@router.post("/bargains/{session_id}/accept-counter")
def accept_bargain_counter(session_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    user = require_user(request, db)
    if user.role != "user":
        raise HTTPException(status_code=403, detail={"code": "CUSTOMER_REQUIRED", "message": "Customer account required for bargaining."})
    deal = bargain_service.accept_counter(db, session_id=session_id, customer=user)
    session = db.get(bargain_service.BargainSession, deal.session_id)
    return bargain_service.state_payload(db, session.live_session_id if session else "", user)


@router.post("/vendor/bargains/{session_id}/counter")
def counter_bargain(session_id: str, payload: BargainCounterRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    user = require_user(request, db)
    if user.role != "vendor":
        raise HTTPException(status_code=403, detail={"code": "VENDOR_REQUIRED", "message": "Vendor account required."})
    from app.routes.vendor import current_vendor_or_401, assert_vendor_approved

    vendor = current_vendor_or_401(request, db)
    assert_vendor_approved(vendor)
    session = bargain_service.counter_group(db, session_id=session_id, vendor_id=vendor.id, counter_price=payload.counterPrice)
    return bargain_service.state_payload(db, session.live_session_id, user)


@router.post("/vendor/bargains/{session_id}/accept-group")
def accept_bargain_group(session_id: str, payload: BargainAcceptGroupRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    user = require_user(request, db)
    if user.role != "vendor":
        raise HTTPException(status_code=403, detail={"code": "VENDOR_REQUIRED", "message": "Vendor account required."})
    from app.routes.vendor import current_vendor_or_401, assert_vendor_approved

    vendor = current_vendor_or_401(request, db)
    assert_vendor_approved(vendor)
    bargain_service.accept_group(db, session_id=session_id, vendor_id=vendor.id, offer_price=payload.offerPrice)
    session = db.get(bargain_service.BargainSession, session_id)
    return bargain_service.state_payload(db, session.live_session_id if session else "", user)


@router.post("/vendor/bargains/{session_id}/close")
def close_bargain(session_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    user = require_user(request, db)
    if user.role != "vendor":
        raise HTTPException(status_code=403, detail={"code": "VENDOR_REQUIRED", "message": "Vendor account required."})
    from app.routes.vendor import current_vendor_or_401, assert_vendor_approved

    vendor = current_vendor_or_401(request, db)
    assert_vendor_approved(vendor)
    session = db.get(bargain_service.BargainSession, session_id)
    if session is None or session.vendor_id != vendor.id:
        raise HTTPException(status_code=404, detail={"code": "BARGAIN_NOT_FOUND", "message": "Bargain session not found."})
    session.status = "closed"
    db.commit()
    return bargain_service.state_payload(db, session.live_session_id, user)
