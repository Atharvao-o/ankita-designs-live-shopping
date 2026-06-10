from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.models.vendor import Vendor
from app.services.bargain_service import active_deal_for_product


def _cart_item_payload(db: Session, item: CartItem) -> dict:
    product = db.get(Product, item.product_id)
    if product is None:
        return {
            "product_id": item.product_id,
            "title": "Deleted product",
            "price": 0,
            "quantity": item.quantity,
            "vendor_name": "Vendor unavailable",
            "image": "/products/product-placeholder.png",
        }
    vendor = db.get(Vendor, product.vendor_id)
    agreed_price = int(item.agreed_price) if item.agreed_price is not None else None
    price = agreed_price if agreed_price is not None else int(product.price)
    return {
        "product_id": product.id,
        "title": product.title,
        "price": price,
        "original_price": int(product.price) if agreed_price is not None else None,
        "discount_amount": int(item.discount_amount or 0),
        "bargain_deal_id": item.bargain_deal_id,
        "quantity": item.quantity,
        "vendor_name": vendor.display_name if vendor else "Vendor unavailable",
        "image": (product.images or ["/products/product-placeholder.png"])[0],
    }


class CartService:
    def get_or_create_cart(self, db: Session, user_id: str) -> Cart:
        cart = db.scalar(select(Cart).where(Cart.user_id == user_id))
        if cart is None:
            cart = Cart(id=str(uuid4()), user_id=user_id)
            db.add(cart)
            db.commit()
            db.refresh(cart)
        return cart

    def list_items(self, db: Session, user_id: str) -> list[dict]:
        cart = self.get_or_create_cart(db, user_id)
        items = db.scalars(select(CartItem).where(CartItem.cart_id == cart.id).order_by(CartItem.created_at.asc())).all()
        return [_cart_item_payload(db, item) for item in items]

    def add_item(self, db: Session, user_id: str, product_id: str, quantity: int, live_session_id: str | None = None) -> list[dict]:
        product = db.get(Product, product_id)
        if product is None or product.status != "active":
            raise HTTPException(status_code=404, detail={"code": "PRODUCT_NOT_FOUND", "message": "Product not found."})
        if quantity < 1:
            raise HTTPException(status_code=400, detail={"code": "VALIDATION_ERROR", "message": "Quantity must be at least 1."})
        if product.stock < quantity:
            raise HTTPException(status_code=400, detail={"code": "OUT_OF_STOCK", "message": "Product is out of stock."})
        deal = active_deal_for_product(db, user_id=user_id, product_id=product_id, live_session_id=live_session_id)
        agreed_price = int(deal.agreed_price) if deal else None
        discount_amount = int(deal.discount_amount) if deal else 0
        cart = self.get_or_create_cart(db, user_id)
        existing = db.scalar(select(CartItem).where(CartItem.cart_id == cart.id, CartItem.product_id == product_id))
        if existing:
            existing.quantity += quantity
            if deal:
                existing.bargain_deal_id = deal.id
                existing.agreed_price = agreed_price
                existing.discount_amount = discount_amount
        else:
            db.add(CartItem(
                id=str(uuid4()),
                cart_id=cart.id,
                product_id=product_id,
                quantity=quantity,
                bargain_deal_id=deal.id if deal else None,
                agreed_price=agreed_price,
                discount_amount=discount_amount,
            ))
        db.commit()
        return self.list_items(db, user_id)

    def update_item(self, db: Session, user_id: str, product_id: str, quantity: int) -> list[dict]:
        cart = self.get_or_create_cart(db, user_id)
        item = db.scalar(select(CartItem).where(CartItem.cart_id == cart.id, CartItem.product_id == product_id))
        if item is not None:
            if quantity <= 0:
                db.delete(item)
            else:
                item.quantity = quantity
            db.commit()
        return self.list_items(db, user_id)

    def delete_item(self, db: Session, user_id: str, product_id: str) -> list[dict]:
        cart = self.get_or_create_cart(db, user_id)
        item = db.scalar(select(CartItem).where(CartItem.cart_id == cart.id, CartItem.product_id == product_id))
        if item is not None:
            db.delete(item)
            db.commit()
        return self.list_items(db, user_id)

    def clear(self, db: Session, user_id: str) -> None:
        cart = self.get_or_create_cart(db, user_id)
        for item in db.scalars(select(CartItem).where(CartItem.cart_id == cart.id)):
            db.delete(item)
        db.commit()


cart_service = CartService()
