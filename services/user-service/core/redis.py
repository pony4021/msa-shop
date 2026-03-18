# services/user-service/core/redis.py
from redis.asyncio import from_url

from .config import settings


redis_client = from_url(settings.redis_url, decode_responses=True)
