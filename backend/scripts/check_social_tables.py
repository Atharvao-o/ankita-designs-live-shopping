from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import func, inspect, select
from sqlalchemy.exc import SQLAlchemyError

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.database import SessionLocal, engine  # noqa: E402
from app.models.social import PostLike, SavedPost, SavedProduct, VendorFollow, VendorPost, VendorPublicProfile  # noqa: E402


SOCIAL_MODELS = {
    "vendor_public_profiles": VendorPublicProfile,
    "vendor_posts": VendorPost,
    "vendor_follows": VendorFollow,
    "post_likes": PostLike,
    "saved_posts": SavedPost,
    "saved_products": SavedProduct,
}

EXPECTED_INDEXES = {
    "vendor_public_profiles": {"ix_vendor_public_profiles_slug", "ix_vendor_public_profiles_vendor_id"},
    "vendor_posts": {"ix_vendor_posts_vendor_id", "ix_vendor_posts_status", "ix_vendor_posts_moderation_status"},
    "vendor_follows": {"ix_vendor_follows_user_id", "ix_vendor_follows_vendor_id"},
    "post_likes": {"ix_post_likes_user_id", "ix_post_likes_post_id"},
    "saved_posts": {"ix_saved_posts_user_id", "ix_saved_posts_post_id"},
    "saved_products": {"ix_saved_products_user_id", "ix_saved_products_product_id"},
}

EXPECTED_UNIQUES = {
    "vendor_public_profiles": {("vendor_id",), ("slug",)},
    "vendor_follows": {("user_id", "vendor_id")},
    "post_likes": {("user_id", "post_id")},
    "saved_posts": {("user_id", "post_id")},
    "saved_products": {("user_id", "product_id")},
}


def normalized_columns(constraint: dict) -> tuple[str, ...]:
    return tuple(constraint.get("column_names") or [])


def main() -> None:
    try:
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        missing_tables: list[str] = []
        missing_indexes: list[str] = []
        missing_uniques: list[str] = []

        print("Social table health check")
        with SessionLocal() as db:
            for table_name, model in SOCIAL_MODELS.items():
                if table_name not in existing_tables:
                    missing_tables.append(table_name)
                    print(f"{table_name}: MISSING")
                    continue

                row_count = int(db.scalar(select(func.count(model.id))) or 0)
                actual_indexes = {index["name"] for index in inspector.get_indexes(table_name)}
                expected_indexes = EXPECTED_INDEXES.get(table_name, set())
                absent_indexes = sorted(expected_indexes - actual_indexes)
                for index_name in absent_indexes:
                    missing_indexes.append(f"{table_name}.{index_name}")

                actual_uniques = {
                    normalized_columns(constraint)
                    for constraint in inspector.get_unique_constraints(table_name)
                }
                expected_uniques = EXPECTED_UNIQUES.get(table_name, set())
                absent_uniques = sorted(expected_uniques - actual_uniques)
                for columns in absent_uniques:
                    missing_uniques.append(f"{table_name}({', '.join(columns)})")

                print(
                    f"{table_name}: rows={row_count}, "
                    f"indexes={'ok' if not absent_indexes else 'missing ' + ', '.join(absent_indexes)}, "
                    f"unique_constraints={'ok' if not absent_uniques else 'missing ' + ', '.join(','.join(item) for item in absent_uniques)}"
                )
    except SQLAlchemyError as exc:
        print(f"Social table health check could not connect to the database: {exc}", file=sys.stderr)
        raise SystemExit(2) from None

    print("\nSummary")
    print(f"missing tables: {len(missing_tables)}")
    print(f"missing indexes: {len(missing_indexes)}")
    print(f"missing unique constraints: {len(missing_uniques)}")

    if missing_tables:
        print("tables:", ", ".join(missing_tables))
    if missing_indexes:
        print("indexes:", ", ".join(missing_indexes))
    if missing_uniques:
        print("unique constraints:", ", ".join(missing_uniques))

    if missing_tables or missing_indexes or missing_uniques:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
