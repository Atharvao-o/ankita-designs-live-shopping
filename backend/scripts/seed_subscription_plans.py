from __future__ import annotations

import sys
from pathlib import Path
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from sqlalchemy import select  # noqa: E402

from app.database import session_scope  # noqa: E402
from app.models.subscription import SubscriptionPlan  # noqa: E402


DEFAULT_PLANS = [
    {
        "name": "Free",
        "description": "Starter visibility for new vendors. No live slots included.",
        "price": 0,
        "duration_days": 30,
        "product_limit": 10,
        "post_limit": 5,
        "live_slot_limit": 0,
        "exhibition_join_limit": 0,
        "ad_credit_limit": 0,
        "priority_level": 0,
        "analytics_enabled": False,
    },
    {
        "name": "Growth",
        "description": "Monthly plan for active sellers starting live shopping.",
        "price": 799,
        "duration_days": 30,
        "product_limit": 50,
        "post_limit": 30,
        "live_slot_limit": 1,
        "exhibition_join_limit": 1,
        "ad_credit_limit": 0,
        "priority_level": 1,
        "analytics_enabled": True,
    },
    {
        "name": "Pro",
        "description": "Higher catalogue, posting, exhibition, and live slot limits.",
        "price": 1499,
        "duration_days": 30,
        "product_limit": 100,
        "post_limit": 100,
        "live_slot_limit": 4,
        "exhibition_join_limit": 3,
        "ad_credit_limit": 2,
        "priority_level": 2,
        "analytics_enabled": True,
    },
    {
        "name": "Elite",
        "description": "Premium monthly plan with high limits, ad credits, and analytics.",
        "price": 2999,
        "duration_days": 30,
        "product_limit": 9999,
        "post_limit": 9999,
        "live_slot_limit": 10,
        "exhibition_join_limit": 10,
        "ad_credit_limit": 5,
        "priority_level": 3,
        "analytics_enabled": True,
    },
]


def main() -> None:
    created = 0
    skipped = 0
    with session_scope() as db:
        for payload in DEFAULT_PLANS:
            existing = db.scalar(select(SubscriptionPlan).where(SubscriptionPlan.name == payload["name"]))
            if existing:
                skipped += 1
                continue
            db.add(
                SubscriptionPlan(
                    id=f"plan-{uuid4()}",
                    is_active=True,
                    **payload,
                )
            )
            created += 1
    print(f"Subscription plan seed complete. created={created} skipped={skipped}")


if __name__ == "__main__":
    main()
