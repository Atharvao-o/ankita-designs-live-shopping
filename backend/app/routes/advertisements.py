from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.advertisement_banner import AdvertisementBanner
from app.models.exhibition import Exhibition
from app.models.stall import Stall
from app.models.user import User
from app.routes.admin import require_admin


router = APIRouter(tags=["advertisements"])
DESTINATION_TYPES = {"exhibition", "stall"}


class AdvertisementCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    image_url: str = Field(min_length=1, max_length=1000)
    alt_text: str = Field(default="Advertisement banner", max_length=255)
    destination_type: str
    destination_id: str = Field(min_length=1)
    display_order: int = 0
    is_active: bool = True
    starts_at: datetime | None = None
    ends_at: datetime | None = None


class AdvertisementUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    image_url: str | None = Field(default=None, min_length=1, max_length=1000)
    alt_text: str | None = Field(default=None, max_length=255)
    destination_type: str | None = None
    destination_id: str | None = Field(default=None, min_length=1)
    display_order: int | None = None
    is_active: bool | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None


def destination_url(destination_type: str, destination_id: str) -> str:
    if destination_type == "exhibition":
        return f"/exhibition/{destination_id}"
    return f"/stalls/{destination_id}/store"


def validate_destination(db: Session, destination_type: str, destination_id: str) -> None:
    if destination_type not in DESTINATION_TYPES:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_AD_DESTINATION", "message": "Banner destination must be an exhibition or stall."},
        )
    model = Exhibition if destination_type == "exhibition" else Stall
    if db.get(model, destination_id) is None:
        raise HTTPException(
            status_code=404,
            detail={"code": "AD_DESTINATION_NOT_FOUND", "message": f"Selected {destination_type} was not found."},
        )


def normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def validate_schedule(starts_at: datetime | None, ends_at: datetime | None) -> None:
    if starts_at is not None and ends_at is not None and starts_at >= ends_at:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_AD_SCHEDULE", "message": "Banner start time must be before its end time."},
        )


def serialize_banner(banner: AdvertisementBanner) -> dict:
    return {
        "id": banner.id,
        "title": banner.title,
        "imageUrl": banner.image_url,
        "altText": banner.alt_text,
        "destinationType": banner.destination_type,
        "destinationId": banner.destination_id,
        "destinationUrl": destination_url(banner.destination_type, banner.destination_id),
        "displayOrder": banner.display_order,
        "isActive": banner.is_active,
        "startsAt": banner.starts_at.isoformat() if banner.starts_at else None,
        "endsAt": banner.ends_at.isoformat() if banner.ends_at else None,
        "createdAt": banner.created_at.isoformat() if banner.created_at else None,
        "updatedAt": banner.updated_at.isoformat() if banner.updated_at else None,
    }


@router.get("/advertisements")
def get_public_advertisements(db: Session = Depends(get_db)) -> list[dict]:
    now = datetime.utcnow()
    banners = db.scalars(
        select(AdvertisementBanner)
        .where(AdvertisementBanner.is_active.is_(True))
        .order_by(AdvertisementBanner.display_order.asc(), AdvertisementBanner.created_at.desc())
    ).all()
    active_banners = [
        banner
        for banner in banners
        if (banner.starts_at is None or banner.starts_at <= now)
        and (banner.ends_at is None or banner.ends_at > now)
    ]
    return [serialize_banner(banner) for banner in active_banners]


@router.get("/admin/advertisements", dependencies=[Depends(require_admin)])
def get_admin_advertisements(db: Session = Depends(get_db)) -> list[dict]:
    banners = db.scalars(
        select(AdvertisementBanner).order_by(AdvertisementBanner.display_order.asc(), AdvertisementBanner.created_at.desc())
    ).all()
    return [serialize_banner(banner) for banner in banners]


@router.post("/admin/advertisements")
def create_advertisement(
    payload: AdvertisementCreateRequest,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    destination_type = payload.destination_type.strip().lower()
    validate_destination(db, destination_type, payload.destination_id)
    starts_at = normalize_datetime(payload.starts_at)
    ends_at = normalize_datetime(payload.ends_at)
    validate_schedule(starts_at, ends_at)
    banner = AdvertisementBanner(
        id=str(uuid4()),
        title=payload.title.strip(),
        image_url=payload.image_url.strip(),
        alt_text=payload.alt_text.strip() or payload.title.strip(),
        destination_type=destination_type,
        destination_id=payload.destination_id,
        display_order=payload.display_order,
        is_active=payload.is_active,
        starts_at=starts_at,
        ends_at=ends_at,
        created_by_admin_id=admin_user.id,
    )
    db.add(banner)
    db.commit()
    db.refresh(banner)
    return serialize_banner(banner)


@router.patch("/admin/advertisements/{banner_id}")
def update_advertisement(
    banner_id: str,
    payload: AdvertisementUpdateRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    banner = db.get(AdvertisementBanner, banner_id)
    if banner is None:
        raise HTTPException(status_code=404, detail={"code": "ADVERTISEMENT_NOT_FOUND", "message": "Advertisement banner not found."})

    fields = payload.model_fields_set
    destination_type = (payload.destination_type or banner.destination_type).strip().lower()
    destination_id = payload.destination_id or banner.destination_id
    if "destination_type" in fields or "destination_id" in fields:
        validate_destination(db, destination_type, destination_id)

    starts_at = normalize_datetime(payload.starts_at) if "starts_at" in fields else banner.starts_at
    ends_at = normalize_datetime(payload.ends_at) if "ends_at" in fields else banner.ends_at
    validate_schedule(starts_at, ends_at)

    if "title" in fields and payload.title is not None:
        banner.title = payload.title.strip()
    if "image_url" in fields and payload.image_url is not None:
        banner.image_url = payload.image_url.strip()
    if "alt_text" in fields and payload.alt_text is not None:
        banner.alt_text = payload.alt_text.strip() or banner.title
    if "destination_type" in fields:
        banner.destination_type = destination_type
    if "destination_id" in fields:
        banner.destination_id = destination_id
    if "display_order" in fields and payload.display_order is not None:
        banner.display_order = payload.display_order
    if "is_active" in fields and payload.is_active is not None:
        banner.is_active = payload.is_active
    if "starts_at" in fields:
        banner.starts_at = starts_at
    if "ends_at" in fields:
        banner.ends_at = ends_at

    banner.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(banner)
    return serialize_banner(banner)


@router.delete("/admin/advertisements/{banner_id}")
def delete_advertisement(
    banner_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict:
    banner = db.get(AdvertisementBanner, banner_id)
    if banner is None:
        raise HTTPException(status_code=404, detail={"code": "ADVERTISEMENT_NOT_FOUND", "message": "Advertisement banner not found."})
    db.delete(banner)
    db.commit()
    return {"status": "deleted", "id": banner_id}
