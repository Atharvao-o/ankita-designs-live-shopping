from collections.abc import Callable

from redis import Redis

from app.redis_client import get_redis_client


class PresenceService:
    def __init__(self, redis_factory: Callable[[], Redis | None] = get_redis_client) -> None:
        self.redis_factory = redis_factory
        self._memory: dict[str, int | str] = {}

    def set_user_presence(self, user_id: str, stall_id: str) -> None:
        redis_client = self.redis_factory()
        key = f"expo:presence:{user_id}"
        if redis_client is None:
            self._memory[key] = stall_id
            return
        redis_client.set(key, stall_id, ex=900)

    def get_stall_viewer_count(self, stall_id: str, fallback: int = 0) -> int:
        redis_client = self.redis_factory()
        key = f"expo:stall:{stall_id}:viewers"
        if redis_client is None:
            return int(self._memory.get(key, fallback))
        value = redis_client.get(key)
        return int(value) if value is not None else fallback

    def increment_stall_viewer_count(self, stall_id: str, amount: int = 1) -> int:
        redis_client = self.redis_factory()
        key = f"expo:stall:{stall_id}:viewers"
        if redis_client is None:
            current = int(self._memory.get(key, 0)) + amount
            self._memory[key] = current
            return current
        return int(redis_client.incrby(key, amount))

    def increment_live_reaction(self, session_id: str, amount: int = 1) -> int:
        redis_client = self.redis_factory()
        key = f"expo:live:{session_id}:reactions"
        if redis_client is None:
            current = int(self._memory.get(key, 0)) + amount
            self._memory[key] = current
            return current
        return int(redis_client.incrby(key, amount))

    def cache_live_session(self, session_id: str, payload: str) -> None:
        redis_client = self.redis_factory()
        key = f"expo:live-session:{session_id}"
        if redis_client is None:
            self._memory[key] = payload
            return
        redis_client.set(key, payload, ex=3600)

    def ping(self) -> tuple[bool, str]:
        redis_client = self.redis_factory()
        if redis_client is None:
            return False, "Redis unavailable. Running with in-memory fallback."
        try:
            redis_client.ping()
            return True, "Redis connected"
        except Exception as exc:  # pragma: no cover - runtime environment dependent
            return False, f"Redis unavailable. Running with in-memory fallback. Details: {exc}"


presence_service = PresenceService()
