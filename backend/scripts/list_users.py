from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import select

from app.database import SessionLocal
from app.models.user import User
from app.models.vendor import Vendor


def hash_status(password_hash: str | None) -> str:
    if not password_hash:
        return "missing"
    algorithm = password_hash.split("$", 1)[0]
    return algorithm if algorithm else "unknown"


def main() -> None:
    with SessionLocal() as db:
        users = db.scalars(select(User).order_by(User.created_at.desc())).all()
        if not users:
            print("No users found in the connected database.")
            return

        print("Users in connected database:")
        for user in users:
            vendor = db.scalar(select(Vendor).where(Vendor.user_id == user.id))
            vendor_status = vendor.status if vendor else "-"
            print(
                f"- email={user.email} role={user.role} name={user.name} "
                f"password_hash={hash_status(user.password_hash)} vendor_status={vendor_status}"
            )


if __name__ == "__main__":
    main()
