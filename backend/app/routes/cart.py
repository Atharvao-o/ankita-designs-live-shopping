from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.cart import CartAddRequest, CartResponse, CartUpdateRequest
from app.services.auth_context import current_user_from_request
from app.services.cart_service import cart_service

router = APIRouter(tags=["cart"])


@router.post("/cart/add", response_model=CartResponse)
def add_to_cart(payload: CartAddRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    user = current_user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Login required."})
    items = cart_service.add_item(db, user.id, payload.product_id, payload.quantity, payload.live_session_id)
    return {"items": items}


@router.get("/cart", response_model=CartResponse)
def get_cart(request: Request, db: Session = Depends(get_db)) -> dict:
    user = current_user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Login required."})
    return {"items": cart_service.list_items(db, user.id)}


@router.patch("/cart/items/{item_id}", response_model=CartResponse)
def update_cart_item(item_id: str, payload: CartUpdateRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    user = current_user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Login required."})
    items = cart_service.update_item(db, user.id, item_id, payload.quantity)
    return {"items": items}


@router.delete("/cart/items/{item_id}", response_model=CartResponse)
def delete_cart_item(item_id: str, request: Request, db: Session = Depends(get_db)) -> dict:
    user = current_user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Login required."})
    items = cart_service.delete_item(db, user.id, item_id)
    return {"items": items}
