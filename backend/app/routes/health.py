from fastapi import APIRouter

from app.database import check_database_connection
from app.services.presence_service import presence_service

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict:
    db_ok, db_message = check_database_connection()
    redis_ok, redis_message = presence_service.ping()
    return {
        "status": "healthy",
        "database": {"ok": db_ok, "message": db_message},
        "redis": {"ok": redis_ok, "message": redis_message},
    }
