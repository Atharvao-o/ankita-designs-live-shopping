from __future__ import annotations

import getpass
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import select

from app.database import SessionLocal
from app.models.user import User
from app.services.password_service import hash_password


def main() -> None:
    email = input("User email: ").strip().lower()
    if not email:
        raise SystemExit("Email is required.")

    password = getpass.getpass("New password: ")
    confirm = getpass.getpass("Confirm new password: ")
    if password != confirm:
        raise SystemExit("Passwords do not match.")
    if len(password) < 8:
        raise SystemExit("Password must be at least 8 characters.")

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            raise SystemExit("User not found in the connected database.")
        user.password_hash = hash_password(password)
        db.commit()
        print(f"Password reset for {user.email}.")


if __name__ == "__main__":
    main()
