from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product
from app.schemas.product import ProductResponse
from app.services.db_data_service import serialize_product

router = APIRouter(tags=["products"])


@router.get("/products", response_model=list[ProductResponse])
def get_products(db: Session = Depends(get_db)) -> list[dict]:
    products = db.scalars(select(Product).where(Product.status == "active").order_by(Product.id.asc())).all()
    return [serialize_product(product) for product in products]


@router.get("/products/{product_id}", response_model=ProductResponse)
def get_product(product_id: str, db: Session = Depends(get_db)) -> dict:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail={"code": "PRODUCT_NOT_FOUND", "message": "Product not found."})
    return serialize_product(product)
