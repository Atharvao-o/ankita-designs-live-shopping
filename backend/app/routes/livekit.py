from fastapi import APIRouter

from app.schemas.live_session import LiveKitTokenRequest, LiveKitTokenResponse
from app.services.livekit_service import livekit_service

router = APIRouter(tags=["livekit"])


@router.post("/livekit/token", response_model=LiveKitTokenResponse)
def create_livekit_token(payload: LiveKitTokenRequest) -> dict:
    return livekit_service.create_token(
        room_name=payload.room_name,
        identity=payload.identity,
        role=payload.role,
        stall_id=payload.stall_id,
    )


@router.get("/livekit/config-status")
def get_livekit_config_status() -> dict:
    return livekit_service.config_status()
