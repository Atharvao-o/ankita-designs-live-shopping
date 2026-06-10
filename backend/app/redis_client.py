from typing import Optional

import redis

from app.config import get_settings


settings = get_settings()


def get_redis_client() -> Optional[redis.Redis]:
    try:
        client = redis.Redis.from_url(settings.redis_url, decode_responses=True)
        client.ping()
        return client
    except Exception:
        return None
