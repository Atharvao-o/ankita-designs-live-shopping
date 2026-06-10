from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.live_session import LiveChatMessage, LiveSession
from app.schemas.live_chat import LiveChatMessageCreateRequest, LiveChatMessageResponse
from app.services.db_data_service import now_utc, serialize_message

router = APIRouter(prefix="/live", tags=["live-chat"])


@router.get("/{live_session_id}/messages", response_model=list[LiveChatMessageResponse])
def get_messages(live_session_id: str, db: Session = Depends(get_db)) -> list[dict]:
    if db.get(LiveSession, live_session_id) is None:
        raise HTTPException(status_code=404, detail={"code": "LIVE_SESSION_NOT_FOUND", "message": "Live session not found."})
    messages = db.scalars(
        select(LiveChatMessage)
        .where(LiveChatMessage.live_session_id == live_session_id)
        .order_by(LiveChatMessage.created_at.asc())
    ).all()
    return [serialize_message(message) for message in messages]


@router.post("/{live_session_id}/messages", response_model=LiveChatMessageResponse)
def post_message(live_session_id: str, payload: LiveChatMessageCreateRequest, db: Session = Depends(get_db)) -> dict:
    session = db.get(LiveSession, live_session_id)
    if session is None:
        raise HTTPException(status_code=404, detail={"code": "LIVE_SESSION_NOT_FOUND", "message": "Live session not found."})
    message_text = payload.message.strip()
    if not message_text:
        raise HTTPException(status_code=400, detail={"code": "EMPTY_MESSAGE", "message": "Message cannot be empty."})
    if not payload.sender_id.strip() or not payload.sender_name.strip():
        raise HTTPException(status_code=400, detail={"code": "INVALID_SENDER", "message": "sender_id and sender_name are required."})
    if payload.sender_role not in {"user", "vendor", "admin"}:
        raise HTTPException(status_code=400, detail={"code": "INVALID_SENDER_ROLE", "message": "Invalid sender role."})
    if payload.message_type not in {"text", "product_enquiry", "image", "final_offer", "system"}:
        raise HTTPException(status_code=400, detail={"code": "INVALID_MESSAGE_TYPE", "message": "Invalid message type."})
    message = LiveChatMessage(
        id=str(uuid4()),
        live_session_id=live_session_id,
        sender_id=payload.sender_id.strip(),
        sender_name=payload.sender_name.strip(),
        sender_role=payload.sender_role,
        message=message_text[:500],
        message_type=payload.message_type,
        product_id=payload.product_id,
        offered_price=payload.offered_price,
        offer_status=payload.offer_status,
        created_at=now_utc(),
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return serialize_message(message)
