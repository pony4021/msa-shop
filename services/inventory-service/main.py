# services/inventory-service/main.py
import asyncio
import json
import logging
import sys
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, Response
from sqlalchemy import text

from core.database import Base, engine
from events.consumer import consume_events
from models.inventory import Inventory  # noqa: F401
from routers.inventory import router as inventory_router


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


_setup_logging("inventory-service")

_consumer_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _consumer_task
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    _consumer_task = asyncio.create_task(consume_events())
    try:
        yield
    finally:
        _consumer_task.cancel()
        with suppress(asyncio.CancelledError):
            await _consumer_task
        _consumer_task = None
        await engine.dispose()


app = FastAPI(title="Inventory Service", lifespan=lifespan)
app.include_router(inventory_router, prefix="/api/inventory")


@app.get("/health")
async def health(response: Response) -> dict:
    checks: dict[str, str] = {}
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"
    checks["consumer"] = "ok" if (_consumer_task is not None and not _consumer_task.done()) else "error"
    overall = "ok" if all(v == "ok" for v in checks.values()) else "degraded"
    if overall != "ok":
        response.status_code = 503
    return {"status": overall, **checks}
