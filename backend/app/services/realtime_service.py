from datetime import datetime
from typing import Any


class RealtimeService:
    """In-memory broadcaster placeholder for the WebSocket/Redis milestone."""

    def __init__(self) -> None:
        self.events: list[dict[str, Any]] = []

    def broadcast(self, event: str, payload: dict[str, Any]) -> dict[str, Any]:
        envelope = {
            "event": event,
            "payload": payload,
            "created_at": datetime.now().isoformat(),
        }
        self.events.append(envelope)
        return envelope

    def recent_events(self) -> list[dict[str, Any]]:
        return self.events[-50:]


realtime_service = RealtimeService()
