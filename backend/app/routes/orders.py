from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.order import OrderResponse
from app.services.db_data_service import serialize_order
from app.services.order_service import order_service

router = APIRouter(tags=["orders"])


@router.get("/orders/{order_id}", response_model=OrderResponse)
def get_order(order_id: str, db: Session = Depends(get_db)) -> dict:
    order = order_service.get_order(db, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail={"code": "ORDER_NOT_FOUND", "message": "Order not found."})
    return serialize_order(db, order)
