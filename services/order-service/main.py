# services/order-service/main.py
import json
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from sqlalchemy import text

from core.database import Base, engine
from events.producer import is_producer_ready, start_producer, stop_producer
from models.order import Order, OrderItem  # noqa: F401
from routers.orders import router as orders_router


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


_setup_logging("order-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await start_producer()
    yield
    await stop_producer()
    await engine.dispose()


app = FastAPI(title="Order Service", lifespan=lifespan)
app.include_router(orders_router, prefix="/api/orders")


@app.get("/health")
async def health(response: Response) -> dict:
    checks: dict[str, str] = {}
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"
    checks["kafka"] = "ok" if is_producer_ready() else "error"
    overall = "ok" if all(v == "ok" for v in checks.values()) else "degraded"
    if overall != "ok":
        response.status_code = 503
    return {"status": overall, **checks}
