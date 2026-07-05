from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.exhibition import Exhibition
from app.models.live_session import LiveSession
from app.models.order import Order
from app.models.platform_setting import PlatformSetting
from app.models.stall import Stall
from app.models.user import User
from app.models.vendor import Vendor
from app.models.vendor_exhibition_request import VendorExhibitionRequest
from app.schemas.admin import AdminAnalyticsResponse, AdminDashboardResponse
from app.schemas.order import OrderResponse
from app.schemas.stall import StallResponse
from app.schemas.vendor import VendorResponse
from app.services.analytics_service import analytics_service
from app.services.auth_context import current_user_from_request
from app.services.email_verification_service import send_vendor_correction_email
from app.services.db_data_service import (
    VALID_EXHIBITION_STATUSES,
    generate_stalls_for_exhibition,
    now_utc,
    serialize_exhibition,
    serialize_order,
    serialize_stall,
    serialize_vendor,
    serialize_vendor_request,
    unique_exhibition_id,
    validate_schedule,
)


def require_admin(request: Request, db: Session = Depends(get_db)) -> User:
    user = current_user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=401, detail={"code": "AUTH_REQUIRED", "message": "Admin authentication is required."})
    if user.role != "admin":
        raise HTTPException(status_code=403, detail={"code": "ADMIN_FORBIDDEN", "message": "Admin access is required."})
    request.state.current_user = user
    return user


router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


class ExhibitionCreateRequest(BaseModel):
    title: str
    description: str = ""
    category: str | None = None
    banner_image: str = "/stalls/stall-placeholder.png"
    banner_image_url: str | None = None
    stall_count: int = 0
    start_at: str | None = None
    end_at: str | None = None
    status: str = "draft"
    map_template_id: str | None = None
    mapTemplateId: str | None = None


class ExhibitionUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    category: str | None = None
    banner_image_url: str | None = None
    start_at: str | None = None
    end_at: str | None = None
    status: str | None = None
    map_template_id: str | None = None
    mapTemplateId: str | None = None


class ExhibitionScheduleRequest(BaseModel):
    start_at: str
    end_at: str


class StallCreateRequest(BaseModel):
    exhibition_id: str
    vendor_id: str | None = None
    name: str
    category: str
    map_x: int = 0
    map_y: int = 0
    width: int = 260
    height: int = 180
    is_featured: bool = False
    status: str = "available"


class StallUpdateRequest(BaseModel):
    name: str | None = None
    category: str | None = None
    map_x: int | None = None
    map_y: int | None = None
    width: int | None = None
    height: int | None = None
    is_featured: bool | None = None
    status: str | None = None


class VendorRejectRequest(BaseModel):
    reason: str | None = None


class VendorCorrectionRequest(BaseModel):
    reason: str


class AssignVendorRequest(BaseModel):
    vendor_id: str


class VendorRequestReview(BaseModel):
    reason: str | None = None
    admin_note: str | None = None


class TutorialSettingUpdateRequest(BaseModel):
    enabled: bool


def tutorial_setting_enabled(db: Session) -> bool:
    setting = db.get(PlatformSetting, "tutorial_enabled")
    if setting is None:
        return True
    return setting.value.strip().lower() == "true"


def parse_datetime_or_default(value: str | None, fallback: datetime) -> datetime:
    return datetime.fromisoformat(value) if value else fallback


def get_exhibition_or_404(db: Session, exhibition_id: str) -> Exhibition:
    exhibition = db.get(Exhibition, exhibition_id)
    if exhibition is None:
        raise HTTPException(status_code=404, detail={"code": "EXHIBITION_NOT_FOUND", "message": "Exhibition not found."})
    return exhibition


@router.get("/settings/tutorial")
def get_admin_tutorial_setting(db: Session = Depends(get_db)) -> dict:
    return {"enabled": tutorial_setting_enabled(db)}


@router.patch("/settings/tutorial")
def update_admin_tutorial_setting(payload: TutorialSettingUpdateRequest, db: Session = Depends(get_db)) -> dict:
    setting = db.get(PlatformSetting, "tutorial_enabled")
    if setting is None:
        setting = PlatformSetting(key="tutorial_enabled", value="true" if payload.enabled else "false")
        db.add(setting)
    else:
        setting.value = "true" if payload.enabled else "false"
    db.commit()
    return {"enabled": payload.enabled}


def get_stall_or_404(db: Session, stall_id: str) -> Stall:
    stall = db.get(Stall, stall_id)
    if stall is None:
        raise HTTPException(status_code=404, detail={"code": "STALL_NOT_FOUND", "message": "Stall not found."})
    return stall


@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(db: Session = Depends(get_db)) -> dict:
    return analytics_service.get_admin_dashboard(db)


@router.get("/analytics", response_model=AdminAnalyticsResponse)
def get_admin_analytics(db: Session = Depends(get_db)) -> dict:
    return analytics_service.get_admin_analytics(db)


@router.get("/exhibitions")
def get_admin_exhibitions(db: Session = Depends(get_db)) -> list[dict]:
    exhibitions = db.scalars(select(Exhibition).order_by(Exhibition.created_at.desc())).all()
    return [serialize_exhibition(db, exhibition) for exhibition in exhibitions]


@router.get("/exhibitions/{exhibition_id}")
def get_admin_exhibition(exhibition_id: str, db: Session = Depends(get_db)) -> dict:
    return serialize_exhibition(db, get_exhibition_or_404(db, exhibition_id))


@router.post("/exhibitions")
def create_admin_exhibition(request: Request, payload: ExhibitionCreateRequest, db: Session = Depends(get_db)) -> dict:
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail={"code": "VALIDATION_ERROR", "message": "Exhibition title is required."})
    if payload.status not in VALID_EXHIBITION_STATUSES:
        raise HTTPException(status_code=400, detail={"code": "INVALID_EXHIBITION_STATUS", "message": "Invalid exhibition status."})
    if payload.stall_count < 1:
        raise HTTPException(status_code=400, detail={"code": "VALIDATION_ERROR", "message": "stall_count must be at least 1."})
    default_start = now_utc() + timedelta(days=1)
    default_end = default_start + timedelta(days=7)
    start_at = parse_datetime_or_default(payload.start_at, default_start)
    end_at = parse_datetime_or_default(payload.end_at, default_end)
    validate_schedule(start_at, end_at)
    exhibition = Exhibition(
        id=unique_exhibition_id(db, payload.title),
        title=payload.title.strip(),
        description=payload.description.strip(),
        category=payload.category.strip() if payload.category else None,
        banner_image=payload.banner_image_url or payload.banner_image,
        stall_count=payload.stall_count,
        map_template_id="deprecated-direct-marketplace",
        start_at=start_at,
        end_at=end_at,
        status=payload.status,
        created_by_admin_id=request.state.current_user.id,
        actual_started_at=None,
        paused_at=None,
        ended_at=None,
        created_at=now_utc(),
        updated_at=now_utc(),
    )
    db.add(exhibition)
    generate_stalls_for_exhibition(db, exhibition, payload.stall_count, "deprecated-direct-marketplace")
    db.commit()
    db.refresh(exhibition)
    return {"exhibition": serialize_exhibition(db, exhibition), "stalls_created": payload.stall_count}


@router.patch("/exhibitions/{exhibition_id}")
def update_admin_exhibition(exhibition_id: str, payload: ExhibitionUpdateRequest, db: Session = Depends(get_db)) -> dict:
    exhibition = get_exhibition_or_404(db, exhibition_id)
    if payload.title is not None:
        exhibition.title = payload.title.strip()
    if payload.description is not None:
        exhibition.description = payload.description.strip()
    if payload.category is not None:
        exhibition.category = payload.category
    if payload.banner_image_url is not None:
        exhibition.banner_image = payload.banner_image_url
    if payload.start_at is not None or payload.end_at is not None:
        start_at = parse_datetime_or_default(payload.start_at, exhibition.start_at)
        end_at = parse_datetime_or_default(payload.end_at, exhibition.end_at)
        validate_schedule(start_at, end_at)
        exhibition.start_at = start_at
        exhibition.end_at = end_at
    if payload.status is not None:
        if payload.status not in VALID_EXHIBITION_STATUSES:
            raise HTTPException(status_code=400, detail={"code": "INVALID_EXHIBITION_STATUS", "message": "Invalid exhibition status."})
        exhibition.status = payload.status
    requested_template_id = payload.map_template_id or payload.mapTemplateId
    if requested_template_id is not None:
        exhibition.map_template_id = "deprecated-direct-marketplace"
    exhibition.updated_at = now_utc()
    db.commit()
    db.refresh(exhibition)
    return serialize_exhibition(db, exhibition)


@router.get("/exhibitions/{exhibition_id}/stalls", response_model=list[StallResponse])
def get_admin_exhibition_stalls(exhibition_id: str, db: Session = Depends(get_db)) -> list[dict]:
    get_exhibition_or_404(db, exhibition_id)
    stalls = db.scalars(
        select(Stall)
        .where(Stall.exhibition_id == exhibition_id)
        .order_by(Stall.position_index.asc().nulls_last(), Stall.stall_code.asc().nulls_last(), Stall.id.asc())
    ).all()
    return [serialize_stall(db, stall) for stall in stalls]


@router.get("/exhibitions/{exhibition_id}/vendor-requests")
def get_admin_exhibition_vendor_requests(exhibition_id: str, db: Session = Depends(get_db)) -> list[dict]:
    get_exhibition_or_404(db, exhibition_id)
    requests = db.scalars(
        select(VendorExhibitionRequest)
        .where(VendorExhibitionRequest.exhibition_id == exhibition_id)
        .order_by(VendorExhibitionRequest.requested_at.desc())
    ).all()
    return [serialize_vendor_request(db, request) for request in requests]


@router.post("/exhibitions/{exhibition_id}/vendor-requests/{request_id}/accept")
def accept_admin_exhibition_vendor_request(
    exhibition_id: str,
    request_id: str,
    payload: VendorRequestReview | None = None,
    db: Session = Depends(get_db),
) -> dict:
    get_exhibition_or_404(db, exhibition_id)
    request = db.get(VendorExhibitionRequest, request_id)
    if request is None or request.exhibition_id != exhibition_id:
        raise HTTPException(status_code=404, detail={"code": "VENDOR_REQUEST_NOT_FOUND", "message": "Vendor request not found."})
    request.status = "accepted"
    request.admin_note = payload.admin_note if payload and payload.admin_note is not None else request.admin_note
    request.reviewed_at = now_utc()
    request.reviewed_by_admin_id = "admin-1"
    db.commit()
    db.refresh(request)
    return serialize_vendor_request(db, request)


@router.post("/exhibitions/{exhibition_id}/vendor-requests/{request_id}/deny")
def deny_admin_exhibition_vendor_request(
    exhibition_id: str,
    request_id: str,
    payload: VendorRequestReview | None = None,
    db: Session = Depends(get_db),
) -> dict:
    get_exhibition_or_404(db, exhibition_id)
    request = db.get(VendorExhibitionRequest, request_id)
    if request is None or request.exhibition_id != exhibition_id:
        raise HTTPException(status_code=404, detail={"code": "VENDOR_REQUEST_NOT_FOUND", "message": "Vendor request not found."})
    request.status = "denied"
    request.admin_note = payload.admin_note or payload.reason if payload else request.admin_note
    request.reviewed_at = now_utc()
    request.reviewed_by_admin_id = "admin-1"
    db.commit()
    db.refresh(request)
    return serialize_vendor_request(db, request)


@router.post("/exhibitions/{exhibition_id}/schedule")
def schedule_admin_exhibition(exhibition_id: str, payload: ExhibitionScheduleRequest, db: Session = Depends(get_db)) -> dict:
    exhibition = get_exhibition_or_404(db, exhibition_id)
    start_at = datetime.fromisoformat(payload.start_at)
    end_at = datetime.fromisoformat(payload.end_at)
    validate_schedule(start_at, end_at)
    exhibition.start_at = start_at
    exhibition.end_at = end_at
    exhibition.status = "scheduled"
    exhibition.updated_at = now_utc()
    db.commit()
    db.refresh(exhibition)
    return serialize_exhibition(db, exhibition)


@router.post("/exhibitions/{exhibition_id}/start")
def start_admin_exhibition(exhibition_id: str, db: Session = Depends(get_db)) -> dict:
    exhibition = get_exhibition_or_404(db, exhibition_id)
    if exhibition.status in {"cancelled", "ended", "live"}:
        raise HTTPException(status_code=400, detail={"code": "INVALID_EXHIBITION_STATUS", "message": "Exhibition cannot be started from its current status."})
    exhibition.status = "live"
    exhibition.actual_started_at = now_utc()
    exhibition.updated_at = now_utc()
    db.commit()
    db.refresh(exhibition)
    return serialize_exhibition(db, exhibition)


@router.post("/exhibitions/{exhibition_id}/pause")
def pause_admin_exhibition(exhibition_id: str, db: Session = Depends(get_db)) -> dict:
    exhibition = get_exhibition_or_404(db, exhibition_id)
    if exhibition.status != "live":
        raise HTTPException(status_code=400, detail={"code": "EXHIBITION_NOT_LIVE", "message": "Cannot pause unless exhibition is live."})
    exhibition.status = "paused"
    exhibition.paused_at = now_utc()
    exhibition.updated_at = now_utc()
    stall_ids = select(Stall.id).where(Stall.exhibition_id == exhibition_id)
    for session in db.scalars(select(LiveSession).where(LiveSession.stall_id.in_(stall_ids), LiveSession.status == "live")):
        session.status = "paused"
    db.commit()
    db.refresh(exhibition)
    return serialize_exhibition(db, exhibition)


@router.post("/exhibitions/{exhibition_id}/resume")
def resume_admin_exhibition(exhibition_id: str, db: Session = Depends(get_db)) -> dict:
    exhibition = get_exhibition_or_404(db, exhibition_id)
    if exhibition.status != "paused":
        raise HTTPException(status_code=400, detail={"code": "EXHIBITION_NOT_PAUSED", "message": "Cannot resume unless exhibition is paused."})
    exhibition.status = "live"
    exhibition.updated_at = now_utc()
    stall_ids = select(Stall.id).where(Stall.exhibition_id == exhibition_id)
    for session in db.scalars(select(LiveSession).where(LiveSession.stall_id.in_(stall_ids), LiveSession.status == "paused")):
        session.status = "live"
    db.commit()
    db.refresh(exhibition)
    return serialize_exhibition(db, exhibition)


@router.post("/exhibitions/{exhibition_id}/end")
def end_admin_exhibition(exhibition_id: str, db: Session = Depends(get_db)) -> dict:
    exhibition = get_exhibition_or_404(db, exhibition_id)
    if exhibition.status in {"ended", "cancelled"}:
        raise HTTPException(status_code=400, detail={"code": "EXHIBITION_CLOSED", "message": "Exhibition is already ended or cancelled."})
    exhibition.status = "ended"
    exhibition.ended_at = now_utc()
    exhibition.updated_at = now_utc()
    end_live_sessions_for_exhibition(db, exhibition_id)
    db.commit()
    db.refresh(exhibition)
    return serialize_exhibition(db, exhibition)


@router.post("/exhibitions/{exhibition_id}/cancel")
def cancel_admin_exhibition(exhibition_id: str, db: Session = Depends(get_db)) -> dict:
    exhibition = get_exhibition_or_404(db, exhibition_id)
    if exhibition.status == "ended":
        raise HTTPException(status_code=400, detail={"code": "EXHIBITION_ENDED", "message": "Cannot cancel an ended exhibition."})
    exhibition.status = "cancelled"
    exhibition.ended_at = now_utc()
    exhibition.updated_at = now_utc()
    end_live_sessions_for_exhibition(db, exhibition_id)
    db.commit()
    db.refresh(exhibition)
    return serialize_exhibition(db, exhibition)


def end_live_sessions_for_exhibition(db: Session, exhibition_id: str) -> None:
    stall_ids = select(Stall.id).where(Stall.exhibition_id == exhibition_id)
    for session in db.scalars(select(LiveSession).where(LiveSession.stall_id.in_(stall_ids), LiveSession.status != "ended")):
        session.status = "ended"
        session.ended_at = now_utc()
    for stall in db.scalars(select(Stall).where(Stall.exhibition_id == exhibition_id)):
        stall.live_status = "offline"
        if stall.status == "live":
            stall.status = "assigned" if stall.vendor_id else "available"


@router.get("/orders", response_model=list[OrderResponse])
def get_admin_orders(db: Session = Depends(get_db)) -> list[dict]:
    orders = db.scalars(select(Order).order_by(Order.created_at.desc())).all()
    return [serialize_order(db, order) for order in orders]


@router.get("/vendors", response_model=list[VendorResponse])
def get_admin_vendors(db: Session = Depends(get_db)) -> list[dict]:
    vendors = db.scalars(select(Vendor).order_by(Vendor.created_at.desc())).all()
    return [serialize_vendor(vendor) for vendor in vendors]


@router.patch("/vendors/{vendor_id}/approve")
def approve_vendor(vendor_id: str, db: Session = Depends(get_db)) -> dict:
    return set_vendor_status(vendor_id, "approved", db)


@router.patch("/vendors/{vendor_id}/reject")
def reject_vendor(vendor_id: str, payload: VendorRejectRequest | None = None, db: Session = Depends(get_db)) -> dict:
    return set_vendor_status(vendor_id, "rejected", db, payload.reason if payload else None)


@router.patch("/vendors/{vendor_id}/request-corrections", response_model=VendorResponse)
def request_vendor_corrections(vendor_id: str, payload: VendorCorrectionRequest, db: Session = Depends(get_db)) -> dict:
    vendor = db.get(Vendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=404, detail={"code": "VENDOR_NOT_FOUND", "message": "Vendor not found."})
    if vendor.status == "approved":
        raise HTTPException(
            status_code=409,
            detail={"code": "VENDOR_ALREADY_APPROVED", "message": "Approved vendors cannot be returned to the application correction queue."},
        )
    reason = payload.reason.strip()
    if len(reason) < 5:
        raise HTTPException(
            status_code=400,
            detail={"code": "CORRECTION_REASON_REQUIRED", "message": "Describe the correction the vendor must make."},
        )
    if not vendor.email:
        raise HTTPException(
            status_code=400,
            detail={"code": "VENDOR_EMAIL_MISSING", "message": "This vendor has no email address for the correction notice."},
        )

    send_vendor_correction_email(vendor.email, vendor.display_name or vendor.business_name, reason)
    vendor.status = "changes_requested"
    vendor.rejection_reason = None
    vendor.correction_reason = reason
    vendor.correction_requested_at = now_utc()
    vendor.updated_at = now_utc()
    db.commit()
    db.refresh(vendor)
    return serialize_vendor(vendor)


@router.get("/stalls", response_model=list[StallResponse])
def get_admin_stalls(db: Session = Depends(get_db)) -> list[dict]:
    stalls = db.scalars(select(Stall).order_by(Stall.exhibition_id.asc(), Stall.position_index.asc().nulls_last())).all()
    return [serialize_stall(db, stall) for stall in stalls]


@router.post("/stalls", response_model=StallResponse)
def create_admin_stall(payload: StallCreateRequest, db: Session = Depends(get_db)) -> dict:
    get_exhibition_or_404(db, payload.exhibition_id)
    if payload.vendor_id and db.get(Vendor, payload.vendor_id) is None:
        raise HTTPException(status_code=404, detail={"code": "VENDOR_NOT_FOUND", "message": "Vendor not found."})
    stall = Stall(
        id=f"{payload.exhibition_id}-{payload.name.lower().replace(' ', '-')}",
        exhibition_id=payload.exhibition_id,
        vendor_id=payload.vendor_id,
        stall_code=None,
        name=payload.name,
        category=payload.category,
        description=None,
        map_x=payload.map_x,
        map_y=payload.map_y,
        width=payload.width,
        height=payload.height,
        stall_type="basic",
        rent_amount=999,
        booking_status="draft",
        payment_status="unpaid",
        product_limit=10,
        is_featured=payload.is_featured,
        status=payload.status,
        viewer_count=0,
        image="/stalls/stall-placeholder.png",
        banner_image="/stalls/stall-placeholder.png",
        featured_image="/stalls/stall-placeholder.png",
        live_status="offline",
        proximity_radius=170,
        social_links={},
    )
    if payload.is_featured:
        for existing in db.scalars(select(Stall).where(Stall.exhibition_id == payload.exhibition_id)):
            existing.is_featured = False
    db.add(stall)
    db.commit()
    db.refresh(stall)
    return serialize_stall(db, stall)


@router.patch("/stalls/{stall_id}", response_model=StallResponse)
def update_admin_stall(stall_id: str, payload: StallUpdateRequest, db: Session = Depends(get_db)) -> dict:
    stall = get_stall_or_404(db, stall_id)
    if payload.name is not None:
        stall.name = payload.name
    if payload.category is not None:
        stall.category = payload.category
    if payload.map_x is not None:
        stall.map_x = payload.map_x
    if payload.map_y is not None:
        stall.map_y = payload.map_y
    if payload.width is not None:
        stall.width = payload.width
    if payload.height is not None:
        stall.height = payload.height
    if payload.status is not None:
        stall.status = payload.status
    if payload.is_featured is not None:
        if payload.is_featured:
            for existing in db.scalars(select(Stall).where(Stall.exhibition_id == stall.exhibition_id)):
                existing.is_featured = False
        stall.is_featured = payload.is_featured
    stall.updated_at = now_utc()
    db.commit()
    db.refresh(stall)
    return serialize_stall(db, stall)


@router.post("/stalls/{stall_id}/assign-vendor", response_model=StallResponse)
def assign_vendor_to_stall(stall_id: str, payload: AssignVendorRequest, db: Session = Depends(get_db)) -> dict:
    stall = get_stall_or_404(db, stall_id)
    vendor = db.get(Vendor, payload.vendor_id)
    if vendor is None:
        raise HTTPException(status_code=404, detail={"code": "VENDOR_NOT_FOUND", "message": "Vendor not found."})
    if vendor.status != "approved":
        raise HTTPException(status_code=403, detail={"code": "VENDOR_NOT_APPROVED", "message": "Vendor must be approved before assignment."})
    accepted = db.scalar(
        select(VendorExhibitionRequest).where(
            VendorExhibitionRequest.exhibition_id == stall.exhibition_id,
            VendorExhibitionRequest.vendor_id == vendor.id,
            VendorExhibitionRequest.status == "accepted",
        )
    )
    if accepted is None:
        raise HTTPException(status_code=403, detail={"code": "VENDOR_REQUEST_NOT_ACCEPTED", "message": "Accept the vendor exhibition request before assigning a stall."})
    existing_assignment = db.scalar(
        select(Stall).where(
            Stall.exhibition_id == stall.exhibition_id,
            Stall.vendor_id == vendor.id,
            Stall.id != stall.id,
        )
    )
    if existing_assignment is not None:
        raise HTTPException(status_code=400, detail={"code": "VENDOR_ALREADY_ASSIGNED", "message": "Vendor is already assigned to another stall in this exhibition."})
    stall.vendor_id = vendor.id
    stall.name = stall.name if stall.stall_code else vendor.display_name
    stall.category = vendor.business_category or stall.category
    stall.description = vendor.business_description or stall.description
    stall.vendor_logo = stall.vendor_logo
    stall.status = "assigned"
    stall.assigned_at = now_utc()
    stall.updated_at = now_utc()
    db.commit()
    db.refresh(stall)
    return serialize_stall(db, stall)


@router.post("/stalls/{stall_id}/remove-vendor", response_model=StallResponse)
def remove_vendor_from_stall(stall_id: str, db: Session = Depends(get_db)) -> dict:
    stall = get_stall_or_404(db, stall_id)
    stall.vendor_id = None
    stall.vendor_logo = None
    stall.status = "available"
    stall.assigned_at = None
    stall.live_status = "offline"
    stall.updated_at = now_utc()
    db.commit()
    db.refresh(stall)
    return serialize_stall(db, stall)


def set_vendor_status(vendor_id: str, status: str, db: Session, reason: str | None = None) -> dict:
    vendor = db.get(Vendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=404, detail={"code": "VENDOR_NOT_FOUND", "message": "Vendor not found."})
    vendor.status = status
    vendor.updated_at = now_utc()
    if status == "approved":
        vendor.approved_at = now_utc()
        vendor.approved_by_admin_id = "admin-1"
        vendor.rejection_reason = None
    if status == "rejected":
        vendor.rejection_reason = reason or "Rejected by admin."
    db.commit()
    db.refresh(vendor)
    return serialize_vendor(vendor)
