# services/user-service/main.py
import json
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from sqlalchemy import select, text

from core.config import settings
from core.database import AsyncSessionLocal, Base, engine
from core.security import hash_password
from models.user import User
from routers.users import router as users_router


def _setup_logging(service_name: str) -> None:
    class _JsonFormatter(logging.Formatter):
        def format(self, record: logging.LogRecord) -> str:
            obj = {
                "timestamp": self.formatTime(record),
                "level": record.levelname,
                "logger": record.name,
                "service": service_name,
                "message": record.getMessage(),
            }
            if record.exc_info:
                obj["exc_info"] = self.formatException(record.exc_info)
            return json.dumps(obj, ensure_ascii=False)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(_JsonFormatter())
    logging.basicConfig(level=logging.INFO, handlers=[handler], force=True)


_setup_logging("user-service")


async def ensure_admin_user() -> None:
    async with AsyncSessionLocal() as db:
        existing = (await db.execute(select(User).where(User.email == settings.admin_email))).scalar_one_or_none()
        if existing:
            existing.username = settings.admin_username
            existing.password = hash_password(settings.admin_password)
            existing.is_active = True
            existing.is_admin = True
            await db.commit()
            return

        admin = User(
            email=settings.admin_email,
            username=settings.admin_username,
            password=hash_password(settings.admin_password),
            is_active=True,
            is_admin=True,
        )
        db.add(admin)
        await db.commit()


async def ensure_user_columns() -> None:
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ NULL"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await ensure_user_columns()
    await ensure_admin_user()
    yield
    await engine.dispose()


app = FastAPI(title="User Service", lifespan=lifespan)
app.include_router(users_router, prefix="/api/users")


@app.get("/health")
async def health(response: Response) -> dict:
    checks: dict[str, str] = {}
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"
    overall = "ok" if all(v == "ok" for v in checks.values()) else "degraded"
    if overall != "ok":
        response.status_code = 503
    return {"status": overall, **checks}
