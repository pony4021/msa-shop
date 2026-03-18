# services/payment-event-service/events/consumer.py
import json
import logging
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from aiokafka import AIOKafkaConsumer
from sqlalchemy import select

from core.config import settings
from core.database import AsyncSessionLocal
from models.payment_event import PaymentEvent

logger = logging.getLogger(__name__)


def _parse_iso8601(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


async def _save_payment_event(event: dict) -> None:
    payment_id = UUID(event["payment_id"])
    async with AsyncSessionLocal() as db:
        existing = (await db.execute(select(PaymentEvent).where(PaymentEvent.payment_id == payment_id))).scalar_one_or_none()
        if existing:
            existing.status = str(event["status"])
            existing.amount = Decimal(str(event["amount"]))
            existing.event_created_at = _parse_iso8601(str(event["created_at"]))
            existing.payload = event
            await db.commit()
            return

        db.add(
            PaymentEvent(
                event_type=str(event["event_type"]),
                payment_id=payment_id,
                order_id=UUID(event["order_id"]),
                user_id=UUID(event["user_id"]),
                amount=Decimal(str(event["amount"])),
                status=str(event["status"]),
                event_created_at=_parse_iso8601(str(event["created_at"])),
                payload=event,
            )
        )
        await db.commit()


async def consume_payment_events() -> None:
    consumer = AIOKafkaConsumer(
        settings.kafka_topic_payment_created,
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id=settings.kafka_group_id,
    )
    await consumer.start()
    logger.info(
        "Kafka consumer started: topic=%s group=%s",
        settings.kafka_topic_payment_created,
        settings.kafka_group_id,
    )
    try:
        async for msg in consumer:
            try:
                event = json.loads(msg.value)
                if event.get("event_type") != "payment-created":
                    continue
                await _save_payment_event(event)
                logger.info(
                    "payment-created consumed: topic=%s partition=%s offset=%s payment_id=%s",
                    msg.topic,
                    msg.partition,
                    msg.offset,
                    event.get("payment_id"),
                )
            except Exception:
                logger.exception(
                    "Failed to process payment event: topic=%s partition=%s offset=%s",
                    msg.topic,
                    msg.partition,
                    msg.offset,
                )
    finally:
        await consumer.stop()
