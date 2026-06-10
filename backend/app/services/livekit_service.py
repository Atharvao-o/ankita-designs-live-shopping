from fastapi import HTTPException

from app.config import get_settings

try:
    from livekit import api as livekit_api
except Exception:  # pragma: no cover - optional dependency import/runtime mismatch
    livekit_api = None


class LiveKitService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def get_livekit_config_status(self) -> dict:
        configured = self.is_configured()
        return {
            "livekit_url_configured": bool(self.settings.livekit_url),
            "api_key_configured": bool(self.settings.livekit_api_key),
            "api_secret_configured": bool(self.settings.livekit_api_secret),
            "mode": "real" if configured else "unavailable",
        }

    def config_status(self) -> dict:
        return self.get_livekit_config_status()

    def get_livekit_mode(self) -> str:
        return self.get_livekit_config_status()["mode"]

    def is_configured(self) -> bool:
        return bool(
            self.settings.livekit_url
            and self.settings.livekit_api_key
            and self.settings.livekit_api_secret
            and livekit_api is not None
        )

    def build_room_name(self, exhibition_id: str, stall_id: str) -> str:
        return f"ankita-live-shopping_{exhibition_id}_{stall_id}"

    def create_vendor_token(self, room_name: str, vendor_id: str, vendor_name: str) -> dict:
        return self._create_token(
            room_name=room_name,
            identity=f"vendor_{vendor_id}",
            role="vendor",
            stall_id="",
            display_name=vendor_name,
        )

    def create_user_token(self, room_name: str, user_id: str, user_name: str, stall_id: str = "") -> dict:
        return self._create_token(
            room_name=room_name,
            identity=f"user_{user_id}",
            role="user",
            stall_id=stall_id,
            display_name=user_name,
        )

    def create_admin_token(self, room_name: str, admin_id: str, admin_name: str, stall_id: str = "") -> dict:
        return self._create_token(
            room_name=room_name,
            identity=f"admin_{admin_id}",
            role="admin",
            stall_id=stall_id,
            display_name=admin_name,
        )

    def create_token(self, room_name: str, identity: str, role: str, stall_id: str) -> dict:
        return self._create_token(room_name, identity, role, stall_id, display_name=identity)

    def _create_token(
        self,
        room_name: str,
        identity: str,
        role: str,
        stall_id: str,
        display_name: str | None = None,
    ) -> dict:
        if not self.is_configured():
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "LIVEKIT_NOT_CONFIGURED",
                    "message": "LiveKit credentials are not configured.",
                },
            )

        try:
            can_publish = role in {"vendor", "admin"}
            token = (
                livekit_api.AccessToken(self.settings.livekit_api_key, self.settings.livekit_api_secret)
                .with_identity(identity)
                .with_name(display_name or identity)
                .with_grants(
                    livekit_api.VideoGrants(
                        room_join=True,
                        room=room_name,
                        can_publish=can_publish,
                        can_subscribe=True,
                        can_publish_data=True,
                    )
                )
                .to_jwt()
            )
        except Exception as exc:  # pragma: no cover - depends on LiveKit SDK/runtime
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "TOKEN_GENERATION_FAILED",
                    "message": "Could not generate LiveKit token.",
                },
            ) from exc

        return {
            "mode": "real",
            "url": self.settings.livekit_url,
            "token": token,
            "room_name": room_name,
            "identity": identity,
            "role": role,
            "stall_id": stall_id,
        }


livekit_service = LiveKitService()
