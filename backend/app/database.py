from contextlib import contextmanager
import logging
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

from app.config import get_settings


settings = get_settings()
logger = logging.getLogger(__name__)


def build_engine_connect_args(database_url: str) -> dict:
    connect_args: dict = {"connect_timeout": 10}
    normalized = database_url.lower()
    if "render.com" in normalized and "sslmode=" not in normalized:
        connect_args["sslmode"] = "require"
    return connect_args


class Base(DeclarativeBase):
    pass


engine = create_engine(
    settings.database_url,
    future=True,
    pool_pre_ping=True,
    connect_args=build_engine_connect_args(settings.database_url),
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def check_database_connection() -> tuple[bool, str]:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True, "PostgreSQL connected"
    except Exception as exc:  # pragma: no cover - runtime environment dependent
        return (
            False,
            "PostgreSQL unavailable. Start docker-compose and set DATABASE_URL. "
            f"Details: {exc}"
        )


def init_database() -> None:
    # Import models before create_all so SQLAlchemy registers every table.
    import app.models  # noqa: F401

    try:
        Base.metadata.create_all(bind=engine)
    except SQLAlchemyError:
        logger.exception("Database table creation failed during application startup.")
        raise
    statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(32) DEFAULT '' NOT NULL",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(255)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_roles TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_skipped_roles TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_version VARCHAR(32)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_skipped_at TIMESTAMP",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP",
        "ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS category VARCHAR(120)",
        "ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS stall_count INTEGER DEFAULT 0 NOT NULL",
        "ALTER TABLE exhibitions ADD COLUMN IF NOT EXISTS map_template_id VARCHAR(64) DEFAULT 'deprecated-direct-marketplace' NOT NULL",
        "ALTER TABLE stalls ALTER COLUMN vendor_id DROP NOT NULL",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS stall_code VARCHAR(32)",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS description TEXT",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS position_index INTEGER",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS zone VARCHAR(32)",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS stall_type VARCHAR(32) DEFAULT 'basic' NOT NULL",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS rent_amount INTEGER DEFAULT 0 NOT NULL",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS booking_status VARCHAR(64) DEFAULT 'draft' NOT NULL",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS payment_status VARCHAR(64) DEFAULT 'unpaid' NOT NULL",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS product_limit INTEGER DEFAULT 10 NOT NULL",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS viewer_count INTEGER DEFAULT 0 NOT NULL",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS image VARCHAR(500)",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS banner_image VARCHAR(500)",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS vendor_logo VARCHAR(500)",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS featured_image VARCHAR(500)",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS live_status VARCHAR(64)",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS break_message TEXT",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS delivery_area TEXT",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS active_from TIMESTAMP",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS active_to TIMESTAMP",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS proximity_radius INTEGER",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS route VARCHAR(500)",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS social_links JSON",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS created_at TIMESTAMP",
        "ALTER TABLE stalls ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS offer_code VARCHAR(64)",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(120)",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_price NUMERIC(10, 2)",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url VARCHAR(500)",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS catalogue_pdf_url VARCHAR(500)",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_area TEXT",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS cod_available INTEGER DEFAULT 0",
        "ALTER TABLE products ADD COLUMN IF NOT EXISTS courier_charge NUMERIC(10, 2)",
        "ALTER TABLE live_sessions ALTER COLUMN pinned_product_id DROP NOT NULL",
        "ALTER TABLE live_sessions ALTER COLUMN stream_mode SET DEFAULT 'camera'",
        "ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS token_mode VARCHAR(32) DEFAULT 'real'",
        "ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0",
        "ALTER TABLE live_sessions ADD COLUMN IF NOT EXISTS follow_count INTEGER DEFAULT 0",
        "ALTER TABLE live_chat_messages ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255) DEFAULT 'Unknown' NOT NULL",
        "ALTER TABLE live_chat_messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(32) DEFAULT 'text'",
        "ALTER TABLE live_chat_messages ADD COLUMN IF NOT EXISTS product_id VARCHAR",
        "ALTER TABLE live_chat_messages ADD COLUMN IF NOT EXISTS offered_price NUMERIC(10, 2)",
        "ALTER TABLE live_chat_messages ADD COLUMN IF NOT EXISTS offer_status VARCHAR(32)",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS owner_name VARCHAR(120)",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS business_category VARCHAR(120)",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS product_categories JSON",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS phone VARCHAR(32)",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS email VARCHAR(255)",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS instagram VARCHAR(500)",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS website VARCHAR(500)",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(120)",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS business_description TEXT",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS gst_number VARCHAR(64)",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS fssai_number VARCHAR(64)",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS pan_number VARCHAR(64)",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS upi_id VARCHAR(120)",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(120)",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS ifsc VARCHAR(32)",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS address TEXT",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS city VARCHAR(120)",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS state VARCHAR(120)",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS pincode VARCHAR(16)",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS rejection_reason TEXT",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS approved_by_admin_id VARCHAR(255)",
        "ALTER TABLE vendors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address TEXT",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_map_url TEXT",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(120)",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS package_photo_url TEXT",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMP",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_charge NUMERIC(10, 2) DEFAULT 0 NOT NULL",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(10, 2) DEFAULT 0 NOT NULL",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10, 2) DEFAULT 0 NOT NULL",
        "ALTER TABLE orders ADD COLUMN IF NOT EXISTS vendor_payout_amount NUMERIC(10, 2) DEFAULT 0 NOT NULL",
        "ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS bargain_deal_id VARCHAR",
        "ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS agreed_price NUMERIC(10, 2)",
        "ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0 NOT NULL",
        "ALTER TABLE vendor_posts ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN DEFAULT FALSE NOT NULL",
        "CREATE INDEX IF NOT EXISTS ix_vendor_public_profiles_slug ON vendor_public_profiles (slug)",
        "CREATE INDEX IF NOT EXISTS ix_vendor_public_profiles_vendor_id ON vendor_public_profiles (vendor_id)",
        "CREATE INDEX IF NOT EXISTS ix_vendor_posts_vendor_id ON vendor_posts (vendor_id)",
        "CREATE INDEX IF NOT EXISTS ix_vendor_posts_status ON vendor_posts (status)",
        "CREATE INDEX IF NOT EXISTS ix_vendor_posts_moderation_status ON vendor_posts (moderation_status)",
        "CREATE INDEX IF NOT EXISTS ix_vendor_follows_user_id ON vendor_follows (user_id)",
        "CREATE INDEX IF NOT EXISTS ix_vendor_follows_vendor_id ON vendor_follows (vendor_id)",
        "CREATE INDEX IF NOT EXISTS ix_post_likes_user_id ON post_likes (user_id)",
        "CREATE INDEX IF NOT EXISTS ix_post_likes_post_id ON post_likes (post_id)",
        "CREATE INDEX IF NOT EXISTS ix_saved_posts_user_id ON saved_posts (user_id)",
        "CREATE INDEX IF NOT EXISTS ix_saved_posts_post_id ON saved_posts (post_id)",
        "CREATE INDEX IF NOT EXISTS ix_saved_products_user_id ON saved_products (user_id)",
        "CREATE INDEX IF NOT EXISTS ix_saved_products_product_id ON saved_products (product_id)",
        "CREATE INDEX IF NOT EXISTS ix_subscription_plans_is_active ON subscription_plans (is_active)",
        "CREATE INDEX IF NOT EXISTS ix_vendor_subscriptions_vendor_id ON vendor_subscriptions (vendor_id)",
        "CREATE INDEX IF NOT EXISTS ix_vendor_subscriptions_status ON vendor_subscriptions (status)",
        "CREATE INDEX IF NOT EXISTS ix_vendor_subscriptions_payment_status ON vendor_subscriptions (payment_status)",
        "CREATE INDEX IF NOT EXISTS ix_vendor_subscriptions_ends_at ON vendor_subscriptions (ends_at)",
        "CREATE INDEX IF NOT EXISTS ix_live_slots_vendor_id ON live_slots (vendor_id)",
        "CREATE INDEX IF NOT EXISTS ix_live_slots_status ON live_slots (status)",
        "CREATE INDEX IF NOT EXISTS ix_live_slots_start_time ON live_slots (start_time)",
        "CREATE INDEX IF NOT EXISTS ix_live_slots_end_time ON live_slots (end_time)",
        "CREATE INDEX IF NOT EXISTS ix_live_slots_exhibition_id ON live_slots (exhibition_id)",
        "CREATE INDEX IF NOT EXISTS ix_live_slots_stall_id ON live_slots (stall_id)",
    ]
    try:
        with engine.begin() as connection:
            for statement in statements:
                connection.execute(text(statement))
    except SQLAlchemyError:
        logger.exception("Additive database migration failed during application startup.")
        raise

    logger.info("Database schema initialization completed successfully.")
