from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from sqlalchemy import select

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database import SessionLocal  # noqa: E402
from app.models.product import Product  # noqa: E402
from app.models.social import VendorPost  # noqa: E402
from app.models.vendor import Vendor  # noqa: E402
from app.services.social_service import ensure_vendor_public_profile  # noqa: E402


def build_caption(product: Product) -> str:
    description = (product.description or "").strip()
    if not description:
        return product.title.strip()
    return f"{product.title.strip()}\n\n{description}"[:4000]


def main() -> None:
    checked = 0
    created = 0
    skipped_no_image = 0
    skipped_duplicate = 0
    skipped_unapproved_vendor = 0
    errors = 0

    with SessionLocal() as db:
        products = db.scalars(
            select(Product).where(Product.status == "active").order_by(Product.title.asc(), Product.id.asc())
        ).all()

        for product in products:
            checked += 1
            images = product.images if isinstance(product.images, list) else []
            images = [image for image in images if isinstance(image, str) and image.strip()]
            if not images:
                skipped_no_image += 1
                continue

            duplicate = db.scalar(select(VendorPost.id).where(VendorPost.product_id == product.id))
            if duplicate is not None:
                skipped_duplicate += 1
                continue

            vendor = db.get(Vendor, product.vendor_id)
            if vendor is None or vendor.status != "approved":
                skipped_unapproved_vendor += 1
                continue

            try:
                with db.begin_nested():
                    ensure_vendor_public_profile(db, vendor)
                    now = datetime.utcnow()
                    db.add(
                        VendorPost(
                            id=str(uuid4()),
                            vendor_id=vendor.id,
                            product_id=product.id,
                            stall_id=product.stall_id,
                            post_type="product",
                            caption=build_caption(product),
                            media_urls=images,
                            thumbnail_url=images[0],
                            status="published",
                            moderation_status="approved",
                            is_featured=False,
                            is_promoted=False,
                            published_at=now,
                            created_at=now,
                            updated_at=now,
                        )
                    )
                created += 1
            except Exception as exc:
                errors += 1
                print(f"ERROR product={product.id}: {exc}")

        if errors:
            db.rollback()
            print("Post seed rolled back because one or more products failed.")
        else:
            db.commit()

    print("\nVendor product post seed")
    print(f"products checked: {checked}")
    print(f"posts created: {created if not errors else 0}")
    print(f"skipped no image: {skipped_no_image}")
    print(f"skipped duplicate: {skipped_duplicate}")
    print(f"skipped unapproved vendor: {skipped_unapproved_vendor}")
    print(f"errors: {errors}")

    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
