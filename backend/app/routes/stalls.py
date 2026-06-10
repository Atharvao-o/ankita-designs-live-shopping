from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.exhibition import Exhibition
from app.models.product import Product
from app.models.stall import Stall
from app.schemas.product import ProductResponse
from app.schemas.stall import StallResponse
from app.services.db_data_service import serialize_product, serialize_stall

router = APIRouter(tags=["stalls"])


@router.get("/stalls", response_model=list[StallResponse])
def get_public_stalls(
    search: str = "",
    category: str = "all",
    status: str = "all",
    featured: bool = False,
    db: Session = Depends(get_db),
) -> list[dict]:
    query = select(Stall).where(Stall.vendor_id.is_not(None))
    if category and category != "all":
        query = query.where(Stall.category == category)
    if status and status != "all":
        query = query.where(Stall.live_status == status)
    if featured:
        query = query.where(Stall.is_featured.is_(True))
    stalls = db.scalars(query.order_by(Stall.is_featured.desc(), Stall.updated_at.desc().nulls_last(), Stall.id.asc())).all()
    normalized = search.strip().lower()
    serialized = [serialize_stall(db, stall) for stall in stalls]
    if normalized:
        serialized = [
            stall
            for stall in serialized
            if normalized in f"{stall.get('name', '')} {stall.get('vendorName', '')} {stall.get('category', '')} {stall.get('description', '')}".lower()
        ]
    return serialized


def get_stall_or_404(db: Session, stall_id: str) -> Stall:
    stall = db.get(Stall, stall_id)
    if stall is None:
        raise HTTPException(status_code=404, detail={"code": "STALL_NOT_FOUND", "message": "Stall not found."})
    return stall


@router.get("/exhibitions/{exhibition_id}/stalls", response_model=list[StallResponse])
def get_exhibition_stalls(exhibition_id: str, db: Session = Depends(get_db)) -> list[dict]:
    if db.get(Exhibition, exhibition_id) is None:
        raise HTTPException(status_code=404, detail={"code": "EXHIBITION_NOT_FOUND", "message": "Exhibition not found."})
    stalls = db.scalars(
        select(Stall)
        .where(Stall.exhibition_id == exhibition_id)
        .order_by(Stall.position_index.asc().nulls_last(), Stall.stall_code.asc().nulls_last(), Stall.id.asc())
    ).all()
    return [serialize_stall(db, stall) for stall in stalls]


@router.get("/stalls/{stall_id}", response_model=StallResponse)
def get_stall(stall_id: str, db: Session = Depends(get_db)) -> dict:
    return serialize_stall(db, get_stall_or_404(db, stall_id))


@router.get("/stalls/{stall_id}/products", response_model=list[ProductResponse])
def get_stall_products(stall_id: str, db: Session = Depends(get_db)) -> list[dict]:
    get_stall_or_404(db, stall_id)
    products = db.scalars(
        select(Product)
        .where(Product.stall_id == stall_id, Product.status == "active")
        .order_by(Product.id.asc())
    ).all()
    return [serialize_product(product) for product in products]
