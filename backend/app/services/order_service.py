from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.order import Order, OrderItem
from app.models.payment import Payment
from app.models.product import Product
from app.models.vendor import Vendor
from app.services.bargain_service import active_deal_for_product
from app.services.db_data_service import now_utc, serialize_order


class OrderService:
    def create_order(
        self,
        db: Session,
        items: list[dict],
        payment_method: str,
        user_id: str,
        shipping_address: str | None = None,
        shipping_map_url: str | None = None,
    ) -> Order:
        if not items:
            raise HTTPException(status_code=400, detail={"code": "VALIDATION_ERROR", "message": "Checkout requires at least one product."})
        order = Order(
            id=f"AEV-{str(uuid4())[:8].upper()}",
            user_id=user_id,
            total_amount=0,
            discount_amount=0,
            payment_status="pending",
            order_status="placed",
            shipping_address=(shipping_address or "").strip()[:1000] or None,
            shipping_map_url=(shipping_map_url or "").strip()[:1000] or None,
            created_at=now_utc(),
        )
        db.add(order)

        total = 0
        courier_total = 0
        commission_total = 0
        created_items = 0
        for item in items:
            product_id = str(item.get("product_id") or "").strip()
            quantity = int(item.get("quantity") or 1)
            if quantity < 1:
                raise HTTPException(status_code=400, detail={"code": "VALIDATION_ERROR", "message": "Quantity must be at least 1."})
            product = db.get(Product, product_id)
            if product is None or product.status != "active":
                raise HTTPException(status_code=404, detail={"code": "PRODUCT_NOT_FOUND", "message": "Product not found."})
            vendor = db.get(Vendor, product.vendor_id)
            if vendor is None or vendor.status != "approved":
                raise HTTPException(status_code=403, detail={"code": "VENDOR_NOT_APPROVED", "message": "Vendor is not approved for selling."})
            if product.stock < quantity:
                raise HTTPException(status_code=400, detail={"code": "OUT_OF_STOCK", "message": f"{product.title} is out of stock."})
            deal = active_deal_for_product(db, user_id=user_id, product_id=product.id)
            unit_price = int(deal.agreed_price) if deal else int(product.price)
            line_total = unit_price * quantity
            courier_total += int(product.courier_charge or 0)
            commission_total += int(line_total * float(vendor.commission_rate or 0) / 100)
            product.stock -= quantity
            db.add(OrderItem(
                id=str(uuid4()),
                order_id=order.id,
                vendor_id=product.vendor_id,
                product_id=product.id,
                quantity=quantity,
                unit_price=unit_price,
                total_price=line_total,
            ))
            total += line_total
            created_items += 1
            if deal:
                deal.status = "used"
                deal.used_order_id = order.id

        if created_items == 0:
            raise HTTPException(status_code=400, detail={"code": "PRODUCT_NOT_FOUND", "message": "No valid in-stock products were found for checkout."})
        order.courier_charge = courier_total
        order.gst_amount = 0
        order.commission_amount = commission_total
        order.vendor_payout_amount = total - commission_total
        order.total_amount = total + courier_total
        db.add(Payment(
            id=f"payment-{order.id}",
            order_id=order.id,
            provider=payment_method.lower(),
            provider_payment_id=f"pending-{order.id}",
            amount=order.total_amount,
            status=order.payment_status,
            created_at=order.created_at,
        ))
        db.commit()
        db.refresh(order)
        return order

    def get_order(self, db: Session, order_id: str) -> Order | None:
        return db.get(Order, order_id)

    def list_vendor_orders(self, db: Session, vendor_id: str | None = None) -> list[Order]:
        query = select(Order).order_by(Order.created_at.desc())
        if vendor_id is None:
            return list(db.scalars(query).all())
        order_ids = select(OrderItem.order_id).where(OrderItem.vendor_id == vendor_id)
        return list(db.scalars(select(Order).where(Order.id.in_(order_ids)).order_by(Order.created_at.desc())).all())

    def list_user_orders(self, db: Session, user_id: str) -> list[Order]:
        return list(db.scalars(select(Order).where(Order.user_id == user_id).order_by(Order.created_at.desc())).all())

    def update_vendor_order_status(self, db: Session, order_id: str, vendor_id: str, order_status: str) -> Order | None:
        order = db.get(Order, order_id)
        if order is None:
            return None
        owns_item = db.scalar(select(OrderItem).where(OrderItem.order_id == order_id, OrderItem.vendor_id == vendor_id))
        if owns_item is None:
            raise HTTPException(status_code=403, detail={"code": "UNAUTHORIZED", "message": "Order does not belong to this vendor."})
        order.order_status = order_status
        db.commit()
        db.refresh(order)
        return order

    def fulfill_vendor_order(self, db: Session, order_id: str, vendor_id: str, tracking_number: str, package_photo_url: str) -> Order | None:
        order = db.get(Order, order_id)
        if order is None:
            return None
        owns_item = db.scalar(select(OrderItem).where(OrderItem.order_id == order_id, OrderItem.vendor_id == vendor_id))
        if owns_item is None:
            raise HTTPException(status_code=403, detail={"code": "UNAUTHORIZED", "message": "Order does not belong to this vendor."})
        cleaned_tracking = tracking_number.strip()
        cleaned_photo_url = package_photo_url.strip()
        if not cleaned_tracking:
            raise HTTPException(status_code=400, detail={"code": "TRACKING_REQUIRED", "message": "Tracking number is required before marking the order fulfilled."})
        if not cleaned_photo_url:
            raise HTTPException(status_code=400, detail={"code": "PACKAGE_PHOTO_REQUIRED", "message": "Package photo is required before marking the order fulfilled."})
        order.tracking_number = cleaned_tracking[:120]
        order.package_photo_url = cleaned_photo_url[:1000]
        order.order_status = "fulfilled"
        order.fulfilled_at = now_utc()
        db.commit()
        db.refresh(order)
        return order


order_service = OrderService()

__all__ = ["order_service", "serialize_order"]
