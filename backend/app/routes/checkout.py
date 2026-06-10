from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.checkout import CheckoutCreateOrderRequest
from app.schemas.order import OrderResponse
from app.services.auth_context import current_user_from_request
from app.services.cart_service import cart_service
from app.services.db_data_service import serialize_order
from app.services.order_service import order_service

router = APIRouter(tags=["checkout"])


@router.post("/checkout/create-order", response_model=OrderResponse)
def create_order(payload: CheckoutCreateOrderRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    user = current_user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Login required to checkout."})
    order = order_service.create_order(
        db=db,
        items=[item.model_dump() for item in payload.items],
        payment_method=payload.payment_method,
        user_id=user.id,
        shipping_address=payload.shipping_address,
        shipping_map_url=payload.shipping_map_url,
    )
    cart_service.clear(db, user.id)
    return serialize_order(db, order)
