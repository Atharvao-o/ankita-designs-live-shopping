import json
from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.auth_context import current_user_from_request
from app.services.db_data_service import serialize_order
from app.services.order_service import order_service

router = APIRouter(prefix="/user", tags=["user"])


class AvatarUpdateRequest(BaseModel):
    avatar: str


class OnboardingUpdateRequest(BaseModel):
    role: Literal["preAuth", "user", "vendor", "admin"]
    status: Literal["completed", "skipped"]
    version: str = "v1"


def _read_roles(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        parsed = [item.strip() for item in value.split(",")]
    if not isinstance(parsed, list):
        return []
    return [str(item) for item in parsed if str(item)]


def _write_roles(roles: list[str]) -> str:
    return json.dumps(sorted(set(roles)))


def _serialize_onboarding(user) -> dict:
    return {
        "completedRoles": _read_roles(user.onboarding_completed_roles),
        "skippedRoles": _read_roles(user.onboarding_skipped_roles),
        "version": user.onboarding_version or "v1",
        "completedAt": user.onboarding_completed_at.isoformat() if user.onboarding_completed_at else None,
        "skippedAt": user.onboarding_skipped_at.isoformat() if user.onboarding_skipped_at else None,
    }


@router.get("/orders")
def get_user_orders(request: Request, db: Session = Depends(get_db)) -> list[dict]:
    user = current_user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Login required."})
    return [serialize_order(db, order) for order in order_service.list_user_orders(db, user.id)]


@router.get("/profile")
def get_user_profile(request: Request, db: Session = Depends(get_db)) -> dict:
    user = current_user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Login required."})
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "avatar": user.avatar,
    }


@router.get("/onboarding")
def get_user_onboarding(request: Request, db: Session = Depends(get_db)) -> dict:
    user = current_user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Login required."})
    return _serialize_onboarding(user)


@router.patch("/onboarding")
def update_user_onboarding(payload: OnboardingUpdateRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    user = current_user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Login required."})

    completed_roles = _read_roles(user.onboarding_completed_roles)
    skipped_roles = _read_roles(user.onboarding_skipped_roles)
    now = datetime.utcnow()

    if payload.status == "completed":
        completed_roles.append(payload.role)
        skipped_roles = [role for role in skipped_roles if role != payload.role]
        user.onboarding_completed_at = now
    else:
        skipped_roles.append(payload.role)
        completed_roles = [role for role in completed_roles if role != payload.role]
        user.onboarding_skipped_at = now

    user.onboarding_completed_roles = _write_roles(completed_roles)
    user.onboarding_skipped_roles = _write_roles(skipped_roles)
    user.onboarding_version = payload.version
    db.commit()
    db.refresh(user)
    return _serialize_onboarding(user)


@router.patch("/avatar")
def update_user_avatar(payload: AvatarUpdateRequest, request: Request, db: Session = Depends(get_db)) -> dict:
    user = current_user_from_request(request, db)
    if user is None:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHORIZED", "message": "Login required."})
    user.avatar = payload.avatar
    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "avatar": user.avatar,
    }
