from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import func, select

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database import SessionLocal  # noqa: E402
from app.models.exhibition import Exhibition  # noqa: E402
from app.models.live_session import LiveSession  # noqa: E402
from app.models.order import Order  # noqa: E402
from app.models.product import Product  # noqa: E402
from app.models.stall import Stall  # noqa: E402
from app.models.user import User  # noqa: E402
from app.models.vendor import Vendor  # noqa: E402

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


def count_rows(db, model) -> int:
    return int(db.scalar(select(func.count(model.id))) or 0)


def main() -> None:
    with SessionLocal() as db:
        counts = {
            "users": count_rows(db, User),
            "vendors": count_rows(db, Vendor),
            "exhibitions": count_rows(db, Exhibition),
            "stalls": count_rows(db, Stall),
            "products": count_rows(db, Product),
            "live_sessions": count_rows(db, LiveSession),
            "orders": count_rows(db, Order),
        }
        print("Platform database counts")
        for label, value in counts.items():
            print(f"{label}: {value}")

        demo_matches = {
            "exhibitions": int(db.scalar(select(func.count(Exhibition.id)).where(Exhibition.title.in_(DEMO_NAMES))) or 0),
            "stalls": int(db.scalar(select(func.count(Stall.id)).where(Stall.name.in_(DEMO_NAMES))) or 0),
            "products": int(db.scalar(select(func.count(Product.id)).where(Product.title.in_(DEMO_NAMES))) or 0),
            "vendors": int(
                db.scalar(
                    select(func.count(Vendor.id)).where(
                        (Vendor.business_name.in_(DEMO_NAMES)) | (Vendor.display_name.in_(DEMO_NAMES))
                    )
                )
                or 0
            ),
        }
        print("\nDemo-looking exact-name matches")
        for label, value in demo_matches.items():
            print(f"{label}: {value}")

        print("\nCurrent vendor records")
        vendors = db.scalars(select(Vendor).order_by(Vendor.created_at.desc()).limit(100)).all()
        if not vendors:
            print("No vendors found.")
        else:
            for vendor in vendors:
                print(
                    f"{vendor.id} | display={vendor.display_name!r} | business={vendor.business_name!r} | "
                    f"status={vendor.status!r} | owner={vendor.owner_name!r} | email={vendor.email!r} | "
                    f"category={vendor.business_category!r}"
                )

        print("\nCurrent stall records")
        stalls = db.scalars(
            select(Stall).order_by(Stall.exhibition_id.asc(), Stall.position_index.asc().nulls_last(), Stall.id.asc()).limit(100)
        ).all()
        if not stalls:
            print("No stalls found.")
            return
        for stall in stalls:
            print(
                f"{stall.id} | name={stall.name!r} | code={stall.stall_code!r} | "
                f"exhibition={stall.exhibition_id!r} | vendor={stall.vendor_id!r} | "
                f"status={stall.status!r} | map=({stall.map_x},{stall.map_y})"
            )


if __name__ == "__main__":
    main()
