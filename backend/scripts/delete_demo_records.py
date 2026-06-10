from __future__ import annotations

import os
import sys
from decimal import Decimal
from pathlib import Path
from typing import Iterable, Sequence

from sqlalchemy import func, or_, select

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database import SessionLocal  # noqa: E402
from app.models.cart import CartItem  # noqa: E402
from app.models.exhibition import Exhibition  # noqa: E402
from app.models.live_session import LiveChatMessage, LiveSession  # noqa: E402
from app.models.order import Order, OrderItem  # noqa: E402
from app.models.product import Product  # noqa: E402
from app.models.stall import Stall  # noqa: E402
from app.models.vendor import Vendor  # noqa: E402
from app.models.vendor_exhibition_request import VendorExhibitionRequest  # noqa: E402

CONFIRM_VALUE = "YES_DELETE_DEMO_RECORDS"

# Development/demo names only. This script is intentionally opt-in and should be
# run manually on Render only when these records should be removed from the DB.
DEMO_NAMES = {
    "White Metal Gifts Stall",
    "Kurti & Apparel Stall",
    "Jewellery Stall",
    "Pooja Essentials Stall",
    "Home Decor Stall",
    "Upcoming White Metal Gifts Stall",
    "White Metal Diya Set",
    "Luxury Lifestyle Expo 2025",
    "Ankita Lifestyle Live Expo",
    "Upcoming Festive Expo",
    "Aura Jewels",
    "Casa Luxe",
    "Glow Rituals",
    "Shree Art Gifts",
    "Meera Fashion",
    "Riya Collections",
    "Dev Pooja Store",
    "Home Aura Decor",
}


def ids(records: Iterable[object]) -> set[str]:
    return {str(record.id) for record in records}


def in_filter(column, values: Sequence[str] | set[str]):
    normalized = list(values)
    if not normalized:
        return column.in_(["__none__"])
    return column.in_(normalized)


def print_records(label: str, records: Sequence[object], name_attr: str = "id") -> None:
    print(f"{label}: {len(records)}")
    for record in records:
        value = getattr(record, name_attr, getattr(record, "id", ""))
        print(f"  - {getattr(record, 'id', '')} {value!r}")


def main() -> None:
    should_delete = os.environ.get("DELETE_DEMO_RECORDS_CONFIRM") == CONFIRM_VALUE
    deleted: list[str] = []

    with SessionLocal() as db:
        demo_exhibitions = db.scalars(select(Exhibition).where(Exhibition.title.in_(DEMO_NAMES))).all()
        demo_exhibition_ids = ids(demo_exhibitions)

        demo_vendors = db.scalars(
            select(Vendor).where(or_(Vendor.business_name.in_(DEMO_NAMES), Vendor.display_name.in_(DEMO_NAMES)))
        ).all()
        demo_vendor_ids = ids(demo_vendors)

        demo_stalls = db.scalars(
            select(Stall).where(
                or_(
                    Stall.name.in_(DEMO_NAMES),
                    in_filter(Stall.exhibition_id, demo_exhibition_ids),
                    in_filter(Stall.vendor_id, demo_vendor_ids),
                )
            )
        ).all()
        demo_stall_ids = ids(demo_stalls)

        demo_products = db.scalars(
            select(Product).where(
                or_(
                    Product.title.in_(DEMO_NAMES),
                    in_filter(Product.vendor_id, demo_vendor_ids),
                    in_filter(Product.stall_id, demo_stall_ids),
                )
            )
        ).all()
        demo_product_ids = ids(demo_products)

        demo_live_sessions = db.scalars(
            select(LiveSession).where(
                or_(
                    in_filter(LiveSession.stall_id, demo_stall_ids),
                    in_filter(LiveSession.vendor_id, demo_vendor_ids),
                    in_filter(LiveSession.pinned_product_id, demo_product_ids),
                )
            )
        ).all()
        demo_live_session_ids = ids(demo_live_sessions)

        demo_cart_items = db.scalars(select(CartItem).where(in_filter(CartItem.product_id, demo_product_ids))).all()
        demo_chat_messages = db.scalars(
            select(LiveChatMessage).where(in_filter(LiveChatMessage.live_session_id, demo_live_session_ids))
        ).all()
        demo_vendor_requests = db.scalars(
            select(VendorExhibitionRequest).where(
                or_(
                    in_filter(VendorExhibitionRequest.vendor_id, demo_vendor_ids),
                    in_filter(VendorExhibitionRequest.exhibition_id, demo_exhibition_ids),
                )
            )
        ).all()
        demo_order_items = db.scalars(
            select(OrderItem).where(or_(in_filter(OrderItem.product_id, demo_product_ids), in_filter(OrderItem.vendor_id, demo_vendor_ids)))
        ).all()

        demo_order_item_ids = ids(demo_order_items)
        affected_order_ids = {item.order_id for item in demo_order_items}
        removable_orders: list[Order] = []
        recalculated_orders: list[Order] = []
        for order_id in affected_order_ids:
            order = db.get(Order, order_id)
            if not order:
                continue
            all_items = db.scalars(select(OrderItem).where(OrderItem.order_id == order_id)).all()
            remaining_items = [item for item in all_items if item.id not in demo_order_item_ids]
            if remaining_items:
                order.total_amount = sum((Decimal(item.total_price) for item in remaining_items), Decimal("0"))
                recalculated_orders.append(order)
            else:
                removable_orders.append(order)

        print("Demo record inspection")
        print_records("exhibitions", demo_exhibitions, "title")
        print_records("stalls", demo_stalls, "name")
        print_records("vendors", demo_vendors, "display_name")
        print_records("products", demo_products, "title")
        print_records("live_sessions", demo_live_sessions, "livekit_room_name")
        print_records("cart_items", demo_cart_items)
        print_records("live_chat_messages", demo_chat_messages)
        print_records("vendor_requests", demo_vendor_requests)
        print_records("order_items", demo_order_items)
        print_records("orders_to_delete", removable_orders)
        print_records("orders_to_recalculate", recalculated_orders)

        if not should_delete:
            print(f"\nDry run only. Set DELETE_DEMO_RECORDS_CONFIRM={CONFIRM_VALUE} to delete these records.")
            return

        for collection, label in [
            (demo_cart_items, "cart_item"),
            (demo_chat_messages, "live_chat_message"),
            (demo_live_sessions, "live_session"),
            (demo_vendor_requests, "vendor_request"),
            (demo_order_items, "order_item"),
            (removable_orders, "order"),
            (demo_products, "product"),
            (demo_stalls, "stall"),
            (demo_vendors, "vendor"),
            (demo_exhibitions, "exhibition"),
        ]:
            for record in collection:
                deleted.append(f"{label} {record.id}")
                db.delete(record)

        db.commit()

    print("\nDeleted records")
    print("\n".join(deleted) if deleted else "No matching demo records deleted.")


if __name__ == "__main__":
    main()
