from uuid import uuid4

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.cart import CartItem
from app.models.exhibition import Exhibition
from app.models.live_session import LiveSession
from app.models.product import Product
from app.models.stall import Stall
from app.models.vendor import Vendor
from app.models.vendor_exhibition_request import VendorExhibitionRequest
from app.schemas.live_session import LiveSessionPinProductRequest, LiveSessionStartRequest
from app.schemas.order import OrderResponse, VendorOrderStatusUpdateRequest
from app.schemas.product import ProductCreateRequest, ProductResponse, ProductUpdateRequest
from app.schemas.vendor import VendorDashboardResponse
from app.services.analytics_service import analytics_service
from app.services.auth_context import current_user_from_request
from app.services.db_data_service import (
    now_utc,
    serialize_exhibition,
    serialize_live_session,
    serialize_order,
    serialize_product,
    serialize_stall,
    serialize_vendor_request,
    status_payload,
)
from app.services.livekit_service import livekit_service
from app.services.order_service import order_service
from app.routes.live_sessions import end_live_session, get_active_live_session_for_vendor, pin_product, start_live_session_for_db

router = APIRouter(prefix="/vendor", tags=["vendor"])


class VendorExhibitionJoinRequest(BaseModel):
    message: str = ""


STALL_PLANS = {
    "basic": {"rent_amount": 999, "product_limit": 10},
    "premium": {"rent_amount": 2499, "product_limit": 50},
    "featured": {"rent_amount": 4999, "product_limit": 100},
}


def has_uploaded_brand_asset(value: str | None) -> bool:
    if not value:
        return False
    normalized = value.strip()
    return bool(normalized) and "stall-placeholder" not in normalized


class VendorStallBookingRequest(BaseModel):
    stall_type: str
    exhibition_id: str | None = None
    active_from: str | None = None
    active_to: str | None = None


def ensure_vendor_profile(db: Session, user_id: str, *, name: str, email: str, phone: str = "") -> Vendor:
    vendor = db.scalar(select(Vendor).where(Vendor.user_id == user_id))
    if vendor is not None:
        return vendor

    display_name = (name or email.split("@", 1)[0]).strip()
    vendor = Vendor(
        id=f"vendor-{uuid4()}",
        user_id=user_id,
        owner_name=display_name,
        business_name=display_name,
        display_name=display_name,
        business_category=None,
        product_categories=[],
        phone=phone,
        email=email,
        instagram=None,
        website=None,
        whatsapp=None,
        business_description=None,
        gst_number=None,
        fssai_number=None,
        pan_number=None,
        upi_id=None,
        bank_account_number=None,
        ifsc=None,
        address=None,
        city=None,
        state=None,
        pincode=None,
        status="pending",
        commission_rate=12,
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return vendor


def current_vendor_or_401(request: Request, db: Session) -> Vendor:
    user = current_user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Login required."})
    if user.role != "vendor":
        raise HTTPException(status_code=403, detail={"code": "INVALID_ROLE", "message": "Vendor account required."})
    vendor = db.scalar(select(Vendor).where(Vendor.user_id == user.id))
    if vendor is None:
        return ensure_vendor_profile(db, user.id, name=user.name, email=user.email, phone=user.phone)
    return vendor


def assert_vendor_approved(vendor: Vendor) -> None:
    if vendor.status != "approved":
        raise HTTPException(
            status_code=403,
            detail={"code": "VENDOR_NOT_APPROVED", "message": "Your vendor account must be approved by admin before selling products."},
        )


def get_assigned_vendor_stall(db: Session, vendor: Vendor) -> Stall | None:
    stalls = db.scalars(select(Stall).where(Stall.vendor_id == vendor.id).order_by(Stall.assigned_at.desc().nulls_last(), Stall.id.asc())).all()
    active_stalls: list[Stall] = []
    fallback_stalls: list[Stall] = []
    for stall in stalls:
        exhibition = db.get(Exhibition, stall.exhibition_id)
        if exhibition is None:
            continue
        exhibition_status = status_payload(exhibition)["status"]
        if exhibition_status in {"live", "scheduled", "paused"}:
            active_stalls.append(stall)
        elif exhibition_status != "ended":
            fallback_stalls.append(stall)
    return (active_stalls or fallback_stalls or [None])[0]


@router.get("/dashboard", response_model=VendorDashboardResponse)
def get_vendor_dashboard(request: Request, db: Session = Depends(get_db)) -> dict:
    vendor = current_vendor_or_401(request, db)
    return analytics_service.get_vendor_dashboard(db, vendor.id)


@router.get("/exhibitions")
def get_vendor_exhibitions(db: Session = Depends(get_db)) -> list[dict]:
    exhibitions = db.scalars(select(Exhibition).where(Exhibition.status != "draft").order_by(Exhibition.start_at.asc())).all()
    return [serialize_exhibition(db, exhibition) for exhibition in exhibitions]


@router.get("/exhibitions/requests")
@router.get("/exhibition-requests")
def get_vendor_exhibition_requests(request: Request, db: Session = Depends(get_db)) -> list[dict]:
    vendor = current_vendor_or_401(request, db)
    requests = db.scalars(
        select(VendorExhibitionRequest)
        .where(VendorExhibitionRequest.vendor_id == vendor.id)
        .order_by(VendorExhibitionRequest.requested_at.desc())
    ).all()
    return [serialize_vendor_request(db, item) for item in requests]


@router.post("/exhibitions/{exhibition_id}/request-join")
def request_join_vendor_exhibition(
    exhibition_id: str,
    request: Request,
    payload: VendorExhibitionJoinRequest | None = Body(default=None),
    db: Session = Depends(get_db),
) -> dict:
    vendor = current_vendor_or_401(request, db)
    assert_vendor_approved(vendor)
    exhibition = db.get(Exhibition, exhibition_id)
    if exhibition is None:
        raise HTTPException(status_code=404, detail={"code": "EXHIBITION_NOT_FOUND", "message": "Exhibition not found."})
    exhibition_status = serialize_exhibition(db, exhibition)["status"]
    if exhibition_status == "ended":
        raise HTTPException(status_code=400, detail={"code": "EXHIBITION_ENDED", "message": "Exhibition has ended. Choose another live or upcoming exhibition."})
    if exhibition_status in {"draft", "cancelled"}:
        raise HTTPException(status_code=400, detail={"code": "EXHIBITION_NOT_AVAILABLE", "message": "This exhibition is not available for vendor participation."})
    existing = db.scalar(
        select(VendorExhibitionRequest).where(
            VendorExhibitionRequest.exhibition_id == exhibition_id,
            VendorExhibitionRequest.vendor_id == vendor.id,
            VendorExhibitionRequest.status.in_(["pending", "accepted"]),
        )
    )
    if existing:
        return serialize_vendor_request(db, existing)
    reusable = db.scalar(
        select(VendorExhibitionRequest)
        .where(
            VendorExhibitionRequest.exhibition_id == exhibition_id,
            VendorExhibitionRequest.vendor_id == vendor.id,
            VendorExhibitionRequest.status.in_(["withdrawn", "denied"]),
        )
        .order_by(VendorExhibitionRequest.requested_at.desc())
    )
    if reusable:
        reusable.status = "pending"
        reusable.message = (payload.message if payload else "").strip()
        reusable.admin_note = None
        reusable.requested_at = now_utc()
        reusable.reviewed_at = None
        reusable.reviewed_by_admin_id = None
        db.commit()
        db.refresh(reusable)
        return serialize_vendor_request(db, reusable)
    join_request = VendorExhibitionRequest(
        id=str(uuid4()),
        exhibition_id=exhibition_id,
        vendor_id=vendor.id,
        status="pending",
        message=(payload.message if payload else "").strip(),
        admin_note=None,
        requested_at=now_utc(),
        reviewed_at=None,
        reviewed_by_admin_id=None,
    )
    db.add(join_request)
    db.commit()
    db.refresh(join_request)
    return serialize_vendor_request(db, join_request)


@router.post("/exhibitions/{exhibition_id}/join")
def join_vendor_exhibition(exhibition_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    vendor = current_vendor_or_401(request, db)
    accepted = db.scalar(
        select(VendorExhibitionRequest).where(
            VendorExhibitionRequest.exhibition_id == exhibition_id,
            VendorExhibitionRequest.vendor_id == vendor.id,
            VendorExhibitionRequest.status == "accepted",
        )
    )
    if accepted is None:
        raise HTTPException(status_code=403, detail={"code": "VENDOR_REQUEST_NOT_ACCEPTED", "message": "Vendor request is not accepted for this exhibition."})
    stall = db.scalar(select(Stall).where(Stall.exhibition_id == exhibition_id, Stall.vendor_id == vendor.id))
    return {"status": "joined", "exhibitionId": exhibition_id, "vendorId": vendor.id, "stallId": stall.id if stall else None}


@router.post("/exhibitions/{exhibition_id}/leave")
def leave_vendor_exhibition(exhibition_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    vendor = current_vendor_or_401(request, db)
    participation = db.scalar(
        select(VendorExhibitionRequest)
        .where(
            VendorExhibitionRequest.exhibition_id == exhibition_id,
            VendorExhibitionRequest.vendor_id == vendor.id,
            VendorExhibitionRequest.status.in_(["pending", "accepted"]),
        )
        .order_by(VendorExhibitionRequest.requested_at.desc())
    )
    if participation is None:
        raise HTTPException(status_code=404, detail={"code": "PARTICIPATION_NOT_FOUND", "message": "No active participation request was found for this exhibition."})

    participation.status = "withdrawn"
    participation.admin_note = "Vendor left the exhibition."
    participation.reviewed_at = now_utc()

    stall = db.scalar(select(Stall).where(Stall.exhibition_id == exhibition_id, Stall.vendor_id == vendor.id))
    ended_live_sessions = 0
    if stall is not None:
        live_sessions = db.scalars(select(LiveSession).where(LiveSession.stall_id == stall.id, LiveSession.status == "live")).all()
        for session in live_sessions:
            session.status = "ended"
            session.ended_at = now_utc()
            ended_live_sessions += 1
        stall.vendor_id = None
        stall.status = "available"
        stall.live_status = "offline"
        stall.viewer_count = 0
        stall.assigned_at = None
        stall.updated_at = now_utc()

    db.commit()
    db.refresh(participation)
    return {
        "status": "left",
        "request": serialize_vendor_request(db, participation),
        "stallReleased": stall is not None,
        "endedLiveSessions": ended_live_sessions,
    }


@router.get("/stall")
def get_vendor_stall(request: Request, db: Session = Depends(get_db)) -> dict:
    vendor = current_vendor_or_401(request, db)
    stall = get_assigned_vendor_stall(db, vendor)
    if stall is None:
        raise HTTPException(status_code=404, detail={"code": "STALL_NOT_FOUND", "message": "No stall is assigned to this vendor."})
    return serialize_stall(db, stall)


@router.patch("/stall")
def update_vendor_stall(payload: dict, request: Request, db: Session = Depends(get_db)) -> dict:
    vendor = current_vendor_or_401(request, db)
    assert_vendor_approved(vendor)
    stall = get_assigned_vendor_stall(db, vendor)
    if stall is None:
        raise HTTPException(status_code=404, detail={"code": "STALL_NOT_FOUND", "message": "No stall is assigned to this vendor."})
    if "name" in payload:
        stall.name = str(payload["name"]).strip()
    if "category" in payload:
        stall.category = str(payload["category"]).strip()
    if "description" in payload:
        stall.description = str(payload["description"]).strip()
    if "bannerImage" in payload:
        stall.banner_image = str(payload["bannerImage"]).strip()
    if "vendorLogo" in payload:
        stall.vendor_logo = str(payload["vendorLogo"]).strip()
    if "liveStatus" in payload:
        live_status = str(payload["liveStatus"]).strip()
        if live_status not in {"live", "break", "offline", "busy"}:
            raise HTTPException(status_code=400, detail={"code": "INVALID_LIVE_STATUS", "message": "Invalid stall live status."})
        stall.live_status = live_status
        stall.status = "live" if live_status == "live" else "assigned"
    if "breakMessage" in payload:
        stall.break_message = str(payload["breakMessage"]).strip()
    if "deliveryArea" in payload:
        stall.delivery_area = str(payload["deliveryArea"]).strip()
    db.commit()
    db.refresh(stall)
    return serialize_stall(db, stall)


@router.post("/stall/book")
def book_vendor_stall(payload: VendorStallBookingRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    vendor = current_vendor_or_401(request, db)
    assert_vendor_approved(vendor)
    stall_type = payload.stall_type.strip().lower()
    if stall_type not in STALL_PLANS:
        raise HTTPException(status_code=400, detail={"code": "INVALID_STALL_PLAN", "message": "Choose basic, premium, or featured."})
    stall = get_assigned_vendor_stall(db, vendor)
    if stall is None:
        exhibition = None
        if payload.exhibition_id:
            exhibition = db.get(Exhibition, payload.exhibition_id)
        if exhibition is None:
            exhibition = db.scalar(select(Exhibition).where(Exhibition.status.in_(["live", "scheduled"])).order_by(Exhibition.start_at.asc()))
        if exhibition is None:
            exhibition = Exhibition(
                id="ankita-designs-live-exhibition",
                title="Ankita Designs Online Live Exhibition",
                description="Direct live commerce marketplace.",
                category="Marketplace",
                banner_image="/images/home/hero-expo-bg-light.webp",
                stall_count=0,
                map_template_id="deprecated-direct-marketplace",
                start_at=now_utc(),
                end_at=now_utc(),
                status="live",
                created_by_admin_id="system",
                actual_started_at=now_utc(),
                paused_at=None,
                ended_at=None,
                created_at=now_utc(),
                updated_at=now_utc(),
            )
            db.add(exhibition)
            db.flush()
        stall = Stall(
            id=f"stall-{vendor.id}",
            exhibition_id=exhibition.id,
            vendor_id=vendor.id,
            stall_code=None,
            name=vendor.display_name,
            category=vendor.business_category or "General",
            description=vendor.business_description,
            map_x=0,
            map_y=0,
            width=0,
            height=0,
            position_index=None,
            zone=None,
            is_featured=stall_type == "featured",
            status="assigned",
            viewer_count=0,
            image="/stalls/stall-placeholder.png",
            banner_image="/stalls/stall-placeholder.png",
            vendor_logo=None,
            featured_image="/stalls/stall-placeholder.png",
            live_status="offline",
            route=f"/live/stall-{vendor.id}",
            social_links={},
            assigned_at=now_utc(),
            created_at=now_utc(),
            updated_at=now_utc(),
        )
        db.add(stall)
    plan = STALL_PLANS[stall_type]
    stall.stall_type = stall_type
    stall.rent_amount = plan["rent_amount"]
    stall.product_limit = plan["product_limit"]
    stall.booking_status = "pending_payment"
    stall.payment_status = "unpaid"
    stall.is_featured = stall_type == "featured"
    stall.active_from = now_utc()
    stall.active_to = None
    stall.updated_at = now_utc()
    db.commit()
    db.refresh(stall)
    return serialize_stall(db, stall)


@router.post("/live/start")
def start_vendor_live(request_context: Request, payload: LiveSessionStartRequest, db: Session = Depends(get_db)) -> dict:
    vendor = current_vendor_or_401(request_context, db)
    assert_vendor_approved(vendor)
    if payload.vendor_id != vendor.id:
        raise HTTPException(status_code=403, detail={"code": "INVALID_VENDOR", "message": "Cannot start live for another vendor."})
    stall = db.get(Stall, payload.stall_id)
    if stall is None:
        raise HTTPException(status_code=404, detail={"code": "STALL_NOT_FOUND", "message": "Stall not found."})
    if stall.vendor_id != vendor.id:
        raise HTTPException(status_code=403, detail={"code": "STALL_NOT_ASSIGNED", "message": "This stall is not assigned to your vendor account."})
    missing_branding = []
    if not has_uploaded_brand_asset(stall.banner_image):
        missing_branding.append("bannerImage")
    if not has_uploaded_brand_asset(stall.vendor_logo):
        missing_branding.append("vendorLogo")
    if missing_branding:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "STALL_BRANDING_REQUIRED",
                "message": "Upload a stall banner and vendor logo before going live.",
                "missingFields": missing_branding,
            },
        )
    active_session = get_active_live_session_for_vendor(db, vendor.id)
    if active_session is not None and active_session.stall_id != payload.stall_id:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "VENDOR_ALREADY_LIVE",
                "message": "You are already live in another exhibition. End that live session before starting a new one.",
            },
        )
    live_session = start_live_session_for_db(db, payload)
    if payload.stream_mode == "rtmp":
        livekit = {
            "mode": "rtmp",
            "url": None,
            "token": "",
            "room_name": live_session.livekit_room_name,
            "identity": f"vendor_{live_session.vendor_id}",
            "role": "vendor",
            "stall_id": live_session.stall_id,
            "message": "RTMP ingest is future-ready and not connected to LiveKit camera mode.",
        }
    elif livekit_service.is_configured():
        livekit = livekit_service.create_token(
            room_name=live_session.livekit_room_name,
            identity=f"vendor_{live_session.vendor_id}",
            role="vendor",
            stall_id=live_session.stall_id,
        )
    else:
        livekit = {
            "mode": "fallback",
            "url": None,
            "token": "",
            "room_name": live_session.livekit_room_name,
            "identity": f"vendor_{live_session.vendor_id}",
            "role": "vendor",
            "stall_id": live_session.stall_id,
            "message": "LiveKit is not configured. The stall is marked live for catalogue, chat, and order testing.",
        }
    return {"live_session": serialize_live_session(db, live_session), "livekit": livekit, "role": "vendor"}


@router.post("/live/end")
def end_vendor_live(request: Request, db: Session = Depends(get_db)) -> dict:
    vendor = current_vendor_or_401(request, db)
    session = db.scalar(select(LiveSession).where(LiveSession.vendor_id == vendor.id, LiveSession.status == "live").order_by(LiveSession.started_at.desc().nulls_last()))
    if session is None:
        raise HTTPException(status_code=404, detail={"code": "LIVE_SESSION_NOT_FOUND", "message": "Live session not found."})
    stall = db.get(Stall, session.stall_id)
    if stall is None:
        raise HTTPException(status_code=404, detail={"code": "STALL_NOT_FOUND", "message": "Stall not found."})
    payload = LiveSessionStartRequest(
        exhibition_id=stall.exhibition_id,
        stall_id=session.stall_id,
        vendor_id=vendor.id,
        stream_mode=session.stream_mode,
    )
    return end_live_session(payload, db)


@router.patch("/live/{live_session_id}/pin-product")
def pin_vendor_product(live_session_id: str, payload: LiveSessionPinProductRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    vendor = current_vendor_or_401(request, db)
    assert_vendor_approved(vendor)
    session = db.get(LiveSession, live_session_id)
    if session is None:
        raise HTTPException(status_code=404, detail={"code": "LIVE_SESSION_NOT_FOUND", "message": "Live session not found."})
    if session.vendor_id != vendor.id:
        raise HTTPException(status_code=403, detail={"code": "UNAUTHORIZED", "message": "Live session does not belong to this vendor."})
    return pin_product(live_session_id, payload, db)


@router.get("/orders", response_model=list[OrderResponse])
def get_vendor_orders(request: Request, db: Session = Depends(get_db)) -> list[dict]:
    vendor = current_vendor_or_401(request, db)
    return [serialize_order(db, order) for order in order_service.list_vendor_orders(db, vendor.id)]


@router.patch("/orders/{order_id}/status", response_model=OrderResponse)
def update_vendor_order_status(order_id: str, payload: VendorOrderStatusUpdateRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    vendor = current_vendor_or_401(request, db)
    if payload.orderStatus == "fulfilled":
        order = order_service.fulfill_vendor_order(
            db,
            order_id,
            vendor.id,
            payload.trackingNumber or "",
            payload.packagePhotoUrl or "",
        )
    else:
        order = order_service.update_vendor_order_status(db, order_id, vendor.id, payload.orderStatus)
    if order is None:
        raise HTTPException(status_code=404, detail={"code": "ORDER_NOT_FOUND", "message": "Order not found."})
    return serialize_order(db, order)


@router.get("/products", response_model=list[ProductResponse])
def get_vendor_products(request: Request, db: Session = Depends(get_db)) -> list[dict]:
    vendor = current_vendor_or_401(request, db)
    assert_vendor_approved(vendor)
    products = db.scalars(select(Product).where(Product.vendor_id == vendor.id).order_by(Product.id.asc())).all()
    return [serialize_product(product) for product in products]


@router.post("/products", response_model=ProductResponse)
def create_vendor_product(payload: ProductCreateRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    vendor = current_vendor_or_401(request, db)
    assert_vendor_approved(vendor)
    stall = db.get(Stall, payload.stallId)
    if stall is None:
        raise HTTPException(status_code=404, detail={"code": "STALL_NOT_FOUND", "message": "Stall not found."})
    if stall.vendor_id != vendor.id:
        raise HTTPException(status_code=403, detail={"code": "VENDOR_NOT_ASSIGNED_TO_STALL", "message": "Vendor is not assigned to this stall."})
    product = Product(
        id=str(uuid4()),
        vendor_id=vendor.id,
        stall_id=payload.stallId,
        title=payload.title.strip(),
        description=payload.description.strip(),
        category=payload.category,
        price=payload.price,
        compare_at_price=payload.compareAtPrice or payload.price,
        discount_price=payload.discountPrice,
        images=payload.images or ["/products/product-placeholder.png"],
        video_url=payload.videoUrl,
        catalogue_pdf_url=payload.cataloguePdfUrl,
        stock=payload.stock,
        status=payload.status,
        delivery_area=payload.deliveryArea,
        cod_available=1 if payload.codAvailable else 0,
        courier_charge=payload.courierCharge,
        offer_code=payload.offerCode,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return serialize_product(product)


@router.patch("/products/{product_id}", response_model=ProductResponse)
def update_vendor_product(product_id: str, payload: ProductUpdateRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    vendor = current_vendor_or_401(request, db)
    assert_vendor_approved(vendor)
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail={"code": "PRODUCT_NOT_FOUND", "message": "Product not found."})
    if product.vendor_id != vendor.id:
        raise HTTPException(status_code=403, detail={"code": "PRODUCT_NOT_FROM_VENDOR", "message": "Product does not belong to this vendor."})
    if payload.title is not None:
        product.title = payload.title.strip()
    if payload.description is not None:
        product.description = payload.description.strip()
    if payload.category is not None:
        product.category = payload.category.strip()
    if payload.price is not None:
        product.price = payload.price
    if payload.compareAtPrice is not None:
        product.compare_at_price = payload.compareAtPrice
    if payload.discountPrice is not None:
        product.discount_price = payload.discountPrice
    if payload.images is not None:
        product.images = payload.images or ["/products/product-placeholder.png"]
    if payload.videoUrl is not None:
        product.video_url = payload.videoUrl
    if payload.cataloguePdfUrl is not None:
        product.catalogue_pdf_url = payload.cataloguePdfUrl
    if payload.stock is not None:
        product.stock = payload.stock
    if payload.status is not None:
        product.status = payload.status
    if payload.offerCode is not None:
        product.offer_code = payload.offerCode
    if payload.deliveryArea is not None:
        product.delivery_area = payload.deliveryArea
    if payload.codAvailable is not None:
        product.cod_available = 1 if payload.codAvailable else 0
    if payload.courierCharge is not None:
        product.courier_charge = payload.courierCharge
    db.commit()
    db.refresh(product)
    return serialize_product(product)


@router.delete("/products/{product_id}")
def delete_vendor_product(product_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    vendor = current_vendor_or_401(request, db)
    assert_vendor_approved(vendor)
    product = db.get(Product, product_id)
    if product is None or product.vendor_id != vendor.id:
        raise HTTPException(status_code=404, detail={"code": "PRODUCT_NOT_FOUND", "message": "Product not found."})

    cart_items_removed = (
        db.query(CartItem)
        .filter(CartItem.product_id == product.id)
        .delete(synchronize_session=False)
    )
    product.status = "inactive"
    product.stock = 0
    db.commit()
    return {"ok": True, "status": product.status, "cartItemsRemoved": cart_items_removed}
