from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.exhibition import Exhibition
from app.models.live_session import LiveChatMessage, LiveSession
from app.models.product import Product
from app.models.stall import Stall
from app.schemas.live_session import LiveSessionPinProductRequest, LiveSessionResponse, LiveSessionStartRequest
from app.services.db_data_service import now_utc, serialize_live_session, serialize_message, status_payload
from app.services.livekit_service import livekit_service
from app.services.presence_service import presence_service
from app.services.realtime_service import realtime_service

router = APIRouter(tags=["live-sessions"])

VALID_STREAM_MODES = {"camera", "rtmp"}


def room_name_for(exhibition_id: str, stall_id: str) -> str:
    return livekit_service.build_room_name(exhibition_id, stall_id)


def assert_exhibition_live_for_stall(db: Session, stall: Stall) -> Exhibition:
    exhibition = db.get(Exhibition, stall.exhibition_id)
    if exhibition is None:
        raise HTTPException(status_code=404, detail={"code": "EXHIBITION_NOT_FOUND", "message": "Exhibition not found."})
    countdown = status_payload(exhibition)
    if not countdown["can_vendor_go_live"]:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "EXHIBITION_NOT_LIVE",
                "message": countdown["message"],
                "seconds_until_start": countdown["seconds_until_start"],
            },
        )
    return exhibition


def close_session_if_exhibition_not_live(db: Session, session: LiveSession) -> LiveSession | None:
    stall = db.get(Stall, session.stall_id)
    if stall is None:
        session.status = "ended"
        session.ended_at = session.ended_at or now_utc()
        db.commit()
        return None
    exhibition = db.get(Exhibition, stall.exhibition_id)
    if exhibition is None:
        session.status = "ended"
        session.ended_at = session.ended_at or now_utc()
        stall.status = "assigned" if stall.vendor_id else "available"
        stall.live_status = "offline"
        stall.viewer_count = 0
        db.commit()
        return None
    countdown = status_payload(exhibition)
    if countdown["status"] == "live":
        return session
    session.status = "ended"
    session.ended_at = session.ended_at or now_utc()
    stall.status = "assigned" if stall.vendor_id else "available"
    stall.live_status = "offline"
    stall.viewer_count = 0
    db.commit()
    return None


def get_active_live_session_for_stall(db: Session, stall_id: str) -> LiveSession | None:
    session = db.scalar(
        select(LiveSession)
        .where(LiveSession.stall_id == stall_id, LiveSession.status == "live")
        .order_by(LiveSession.started_at.desc().nulls_last())
    )
    if session is None:
        return None
    return close_session_if_exhibition_not_live(db, session)


def get_active_live_session_for_vendor(db: Session, vendor_id: str) -> LiveSession | None:
    session = db.scalar(
        select(LiveSession)
        .where(LiveSession.vendor_id == vendor_id, LiveSession.status == "live")
        .order_by(LiveSession.started_at.desc().nulls_last())
    )
    if session is None:
        return None
    return close_session_if_exhibition_not_live(db, session)


def start_live_session_for_db(db: Session, payload: LiveSessionStartRequest) -> LiveSession:
    if payload.stream_mode not in VALID_STREAM_MODES:
        raise HTTPException(status_code=400, detail={"code": "INVALID_STREAM_MODE", "message": "stream_mode must be camera or rtmp."})
    stall = db.get(Stall, payload.stall_id)
    if stall is None:
        raise HTTPException(status_code=404, detail={"code": "STALL_NOT_FOUND", "message": "Stall not found."})
    if stall.exhibition_id != payload.exhibition_id:
        raise HTTPException(status_code=400, detail={"code": "STALL_EXHIBITION_MISMATCH", "message": "Stall does not belong to this exhibition."})
    assert_exhibition_live_for_stall(db, stall)
    if stall.vendor_id != payload.vendor_id:
        raise HTTPException(status_code=403, detail={"code": "VENDOR_NOT_ASSIGNED_TO_STALL", "message": "Vendor is not assigned to this stall."})
    active_product_count = db.scalar(
        select(func.count(Product.id)).where(
            Product.vendor_id == payload.vendor_id,
            Product.stall_id == payload.stall_id,
            Product.status == "active",
        )
    ) or 0
    if active_product_count < 2:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "MINIMUM_PRODUCTS_REQUIRED",
                "message": "Add at least 2 active products before going live.",
                "active_product_count": active_product_count,
                "minimum_required": 2,
            },
        )

    token_mode = "real" if payload.stream_mode == "camera" and livekit_service.is_configured() else "fallback"
    rtmp_url = "rtmp://stream.ankita-designs.local/live" if payload.stream_mode == "rtmp" else None
    stream_key = f"ankita-{payload.stall_id}-{datetime.utcnow().strftime('%H%M%S')}" if payload.stream_mode == "rtmp" else None
    room_name = room_name_for(payload.exhibition_id, payload.stall_id)
    pinned_product = db.scalar(
        select(Product).where(Product.vendor_id == payload.vendor_id, Product.stall_id == payload.stall_id, Product.status == "active")
    )
    session = db.scalar(select(LiveSession).where(LiveSession.stall_id == payload.stall_id).order_by(LiveSession.started_at.desc().nulls_last()))
    if session is None:
        session = LiveSession(
            id=str(uuid4()),
            stall_id=payload.stall_id,
            vendor_id=payload.vendor_id,
            livekit_room_name=room_name,
            status="live",
            stream_mode=payload.stream_mode,
            camera_enabled=1 if payload.stream_mode == "camera" else 0,
            rtmp_url=rtmp_url,
            stream_key=stream_key,
            token_mode=token_mode,
            pinned_product_id=pinned_product.id if pinned_product else None,
            viewer_count=0,
            likes_count=0,
            follow_count=0,
            started_at=now_utc(),
            ended_at=None,
        )
        db.add(session)
    else:
        session.status = "live"
        session.vendor_id = payload.vendor_id
        session.livekit_room_name = room_name
        session.stream_mode = payload.stream_mode
        session.camera_enabled = 1 if payload.stream_mode == "camera" else 0
        session.rtmp_url = rtmp_url
        session.stream_key = stream_key
        session.token_mode = token_mode
        session.pinned_product_id = session.pinned_product_id or (pinned_product.id if pinned_product else None)
        session.started_at = now_utc()
        session.ended_at = None
        session.viewer_count = 0
    stall.status = "live"
    stall.live_status = "live"
    stall.viewer_count = session.viewer_count or 0
    db.commit()
    db.refresh(session)
    presence_service.cache_live_session(session.id, session.livekit_room_name)
    realtime_service.broadcast("vendor:live-started", serialize_live_session(db, session))
    return session


@router.post("/live-sessions/start", response_model=LiveSessionResponse)
def start_live_session(payload: LiveSessionStartRequest, db: Session = Depends(get_db)) -> dict:
    return serialize_live_session(db, start_live_session_for_db(db, payload))


@router.post("/live-sessions/end", response_model=LiveSessionResponse)
def end_live_session(payload: LiveSessionStartRequest, db: Session = Depends(get_db)) -> dict:
    session = db.scalar(select(LiveSession).where(LiveSession.stall_id == payload.stall_id).order_by(LiveSession.started_at.desc().nulls_last()))
    if session is None:
        raise HTTPException(status_code=404, detail={"code": "LIVE_SESSION_NOT_FOUND", "message": "Live session not found."})
    session.status = "ended"
    session.ended_at = now_utc()
    stall = db.get(Stall, payload.stall_id)
    if stall:
        stall.status = "assigned" if stall.vendor_id else "available"
        stall.live_status = "offline"
    db.commit()
    db.refresh(session)
    realtime_service.broadcast("vendor:live-ended", {"live_session_id": session.id, "stall_id": payload.stall_id})
    return serialize_live_session(db, session)


@router.patch("/live-sessions/{session_id}/pin-product", response_model=LiveSessionResponse)
def pin_product(session_id: str, payload: LiveSessionPinProductRequest, db: Session = Depends(get_db)) -> dict:
    session = db.get(LiveSession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail={"code": "LIVE_SESSION_NOT_FOUND", "message": "Live session not found."})
    if session.status != "live":
        raise HTTPException(status_code=400, detail={"code": "LIVE_SESSION_NOT_ACTIVE", "message": "Product can be pinned only during an active live session."})
    product = db.get(Product, payload.pinned_product_id)
    if product is None:
        raise HTTPException(status_code=404, detail={"code": "PRODUCT_NOT_FOUND", "message": "Product not found."})
    if product.vendor_id != session.vendor_id:
        raise HTTPException(status_code=403, detail={"code": "PRODUCT_NOT_FROM_VENDOR", "message": "Product does not belong to this vendor."})
    session.pinned_product_id = payload.pinned_product_id
    db.commit()
    db.refresh(session)
    serialized = serialize_live_session(db, session)
    realtime_service.broadcast("live:pin-product", serialized)
    return serialized


@router.get("/live-sessions/stall/{stall_id}", response_model=LiveSessionResponse)
def get_stall_live_session(stall_id: str, db: Session = Depends(get_db)) -> dict:
    session = get_active_live_session_for_stall(db, stall_id)
    if session is None:
        raise HTTPException(status_code=404, detail={"code": "LIVE_SESSION_NOT_FOUND", "message": "Live session not found."})
    return serialize_live_session(db, session)


@router.get("/live-sessions/{stall_id}", response_model=LiveSessionResponse)
def get_stall_live_session_alias(stall_id: str, db: Session = Depends(get_db)) -> dict:
    return get_stall_live_session(stall_id, db)


@router.post("/live-sessions/{stall_id}/join")
def join_stall_live_session(stall_id: str, db: Session = Depends(get_db)) -> dict:
    stall = db.get(Stall, stall_id)
    if stall is None:
        raise HTTPException(status_code=404, detail={"code": "STALL_NOT_FOUND", "message": "Stall not found."})
    session = get_active_live_session_for_stall(db, stall_id)
    if session is None:
        raise HTTPException(status_code=404, detail={"code": "LIVE_SESSION_NOT_ACTIVE", "message": "Live session is not active."})
    session.viewer_count = (session.viewer_count or 0) + 1
    stall.viewer_count = session.viewer_count
    db.commit()
    db.refresh(session)
    live_session = serialize_live_session(db, session)
    messages = db.scalars(
        select(LiveChatMessage)
        .where(LiveChatMessage.live_session_id == session.id)
        .order_by(LiveChatMessage.created_at.asc())
    ).all()
    if livekit_service.is_configured():
        livekit = livekit_service.create_token(
            room_name=session.livekit_room_name,
            identity=f"user-{session.viewer_count}",
            role="user",
            stall_id=stall_id,
        )
    else:
        livekit = {
            "mode": "fallback",
            "url": None,
            "token": "",
            "room_name": session.livekit_room_name,
            "identity": f"user-{session.viewer_count}",
            "role": "user",
            "stall_id": stall_id,
            "message": "LiveKit is not configured. Product catalogue and chat are available.",
        }
    realtime_service.broadcast("live:viewer-count", {"stall_id": stall_id, "viewer_count": session.viewer_count})
    return {
        "live_session": live_session,
        "pinned_product": live_session["pinned_product"],
        "messages": [serialize_message(message) for message in messages],
        "livekit": livekit,
        "role": "user",
    }


@router.get("/live-sessions/{stall_id}/state")
def get_stall_live_state(stall_id: str, db: Session = Depends(get_db)) -> dict:
    session = get_active_live_session_for_stall(db, stall_id)
    if session is None:
        raise HTTPException(status_code=404, detail={"code": "LIVE_SESSION_NOT_ACTIVE", "message": "Live session is not active."})
    live_session = serialize_live_session(db, session)
    messages = db.scalars(
        select(LiveChatMessage)
        .where(LiveChatMessage.live_session_id == session.id)
        .order_by(LiveChatMessage.created_at.asc())
    ).all()
    return {
        "live_session": live_session,
        "pinned_product": live_session["pinned_product"],
        "messages": [serialize_message(message) for message in messages],
    }


@router.get("/live-sessions/{stall_id}/chat")
def get_stall_live_chat(stall_id: str, db: Session = Depends(get_db)) -> list[dict]:
    session = get_active_live_session_for_stall(db, stall_id)
    if session is None:
        raise HTTPException(status_code=404, detail={"code": "LIVE_SESSION_NOT_ACTIVE", "message": "Live session is not active."})
    messages = db.scalars(
        select(LiveChatMessage)
        .where(LiveChatMessage.live_session_id == session.id)
        .order_by(LiveChatMessage.created_at.asc())
    ).all()
    return [serialize_message(message) for message in messages]


@router.post("/live-sessions/{stall_id}/chat")
def post_stall_live_chat(stall_id: str, payload: dict, db: Session = Depends(get_db)) -> dict:
    session = get_active_live_session_for_stall(db, stall_id)
    if session is None:
        raise HTTPException(status_code=404, detail={"code": "LIVE_SESSION_NOT_ACTIVE", "message": "Live session is not active."})
    message_text = str(payload.get("message", "")).strip()
    if not message_text:
        raise HTTPException(status_code=400, detail={"code": "EMPTY_MESSAGE", "message": "Message cannot be empty."})
    sender_id = str(payload.get("sender_id") or "").strip()
    sender_name = str(payload.get("sender_name") or "").strip()
    sender_role = str(payload.get("sender_role") or "user")
    if not sender_id or not sender_name:
        raise HTTPException(status_code=400, detail={"code": "INVALID_SENDER", "message": "sender_id and sender_name are required."})
    if sender_role not in {"user", "vendor", "admin"}:
        raise HTTPException(status_code=400, detail={"code": "INVALID_SENDER_ROLE", "message": "Invalid sender role."})
    message = LiveChatMessage(
        id=str(uuid4()),
        live_session_id=session.id,
        sender_id=sender_id,
        sender_name=sender_name,
        sender_role=sender_role,
        message=message_text[:500],
        created_at=now_utc(),
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    serialized = serialize_message(message)
    realtime_service.broadcast("live:message", {"stall_id": stall_id, "message": serialized})
    return serialized
