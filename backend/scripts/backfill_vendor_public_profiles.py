from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import select

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database import SessionLocal  # noqa: E402
from app.models.social import VendorPublicProfile  # noqa: E402
from app.models.vendor import Vendor  # noqa: E402
from app.services.social_service import ensure_vendor_public_profile, normalize_slug  # noqa: E402


def main() -> None:
    checked = 0
    created = 0
    skipped = 0
    collisions_resolved = 0
    errors = 0

    with SessionLocal() as db:
        vendors = db.scalars(select(Vendor).order_by(Vendor.created_at.asc(), Vendor.id.asc())).all()
        for vendor in vendors:
            checked += 1
            existing = db.scalar(select(VendorPublicProfile).where(VendorPublicProfile.vendor_id == vendor.id))
            if existing is not None:
                skipped += 1
                continue

            try:
                requested_slug = normalize_slug(vendor.display_name or vendor.business_name or vendor.id)
                with db.begin_nested():
                    profile = ensure_vendor_public_profile(db, vendor)
                    if profile.slug != requested_slug:
                        collisions_resolved += 1
                created += 1
            except Exception as exc:
                errors += 1
                print(f"ERROR vendor={vendor.id}: {exc}")

        if errors:
            db.rollback()
            print("Backfill rolled back because one or more vendor profiles failed.")
        else:
            db.commit()

    print("\nVendor public profile backfill")
    print(f"total vendors checked: {checked}")
    print(f"profiles created: {created if not errors else 0}")
    print(f"profiles skipped: {skipped}")
    print(f"slug collisions resolved: {collisions_resolved if not errors else 0}")
    print(f"errors: {errors}")

    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
