# services/payment-event-service/main.py
import asyncio
import json
import logging
import sys
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI

from core.database import Base, engine
from events.consumer import consume_payment_events
from models.payment_event import PaymentEvent
from routers.payment_events import router as payment_events_router


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


_setup_logging("payment-event-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    consumer_task = asyncio.create_task(consume_payment_events())
    try:
        yield
    finally:
        consumer_task.cancel()
        with suppress(asyncio.CancelledError):
            await consumer_task
        await engine.dispose()


app = FastAPI(title="Payment Event Service", lifespan=lifespan)
app.include_router(payment_events_router, prefix="/api/payment-events")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
