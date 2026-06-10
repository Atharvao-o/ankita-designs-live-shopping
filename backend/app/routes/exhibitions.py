from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.exhibition import Exhibition
from app.models.stall import Stall
from app.schemas.exhibition import ExhibitionEntryResponse, ExhibitionResponse, ExhibitionStatusResponse
from app.services.db_data_service import serialize_exhibition, serialize_stall, status_payload, sync_exhibition_completion

router = APIRouter(tags=["exhibitions"])


def get_exhibition_or_404(db: Session, exhibition_id: str) -> Exhibition:
    exhibition = db.get(Exhibition, exhibition_id)
    if exhibition is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail={"code": "EXHIBITION_NOT_FOUND", "message": "Exhibition not found."})
    return exhibition


@router.get("/exhibitions", response_model=list[ExhibitionResponse])
def get_exhibitions(db: Session = Depends(get_db)) -> list[dict]:
    exhibitions = db.scalars(
        select(Exhibition)
        .where(Exhibition.status != "draft")
        .order_by(Exhibition.start_at.asc())
    ).all()
    return [serialize_exhibition(db, exhibition) for exhibition in exhibitions]


@router.get("/exhibitions/{exhibition_id}", response_model=ExhibitionResponse)
def get_exhibition(exhibition_id: str, db: Session = Depends(get_db)) -> dict:
    return serialize_exhibition(db, get_exhibition_or_404(db, exhibition_id))


@router.get("/exhibitions/{exhibition_id}/status", response_model=ExhibitionStatusResponse)
def get_exhibition_status(exhibition_id: str, db: Session = Depends(get_db)) -> dict:
    exhibition = get_exhibition_or_404(db, exhibition_id)
    sync_exhibition_completion(db, exhibition)
    return status_payload(exhibition)


@router.get("/exhibitions/{exhibition_id}/entry", response_model=ExhibitionEntryResponse)
def get_exhibition_entry(exhibition_id: str, db: Session = Depends(get_db)) -> dict:
    exhibition = get_exhibition_or_404(db, exhibition_id)
    sync_exhibition_completion(db, exhibition)
    countdown = status_payload(exhibition)
    stalls = db.scalars(
        select(Stall)
        .where(Stall.exhibition_id == exhibition_id)
        .order_by(Stall.position_index.asc().nulls_last(), Stall.stall_code.asc().nulls_last(), Stall.id.asc())
    ).all()
    return {
        "can_enter": countdown["can_user_enter"],
        "reason": countdown["message"],
        "exhibition_status": countdown["status"],
        "countdown": countdown,
        "exhibition": serialize_exhibition(db, exhibition),
        "stalls": [serialize_stall(db, stall) for stall in stalls] if countdown["can_user_enter"] else [],
    }
