# services/payment-service/events/producer.py
import json
import logging

from aiokafka import AIOKafkaProducer

from core.config import settings

logger = logging.getLogger(__name__)

_producer: AIOKafkaProducer | None = None


async def start_producer() -> None:
    global _producer
    _producer = AIOKafkaProducer(bootstrap_servers=settings.kafka_bootstrap_servers)
    await _producer.start()
    logger.info("Kafka producer started")


async def stop_producer() -> None:
    global _producer
    if _producer is not None:
        await _producer.stop()
        _producer = None
        logger.info("Kafka producer stopped")


def is_producer_ready() -> bool:
    return _producer is not None


async def produce_payment_created(event: dict) -> None:
    if _producer is None:
        raise RuntimeError("Kafka producer not initialized")
    try:
        await _producer.send_and_wait(
            settings.kafka_topic_payment_created,
            json.dumps(event).encode(),
        )
        logger.info("Kafka event published: payment_id=%s", event.get("payment_id"))
    except Exception:
        logger.exception("Kafka event publish failed: payment_id=%s", event.get("payment_id"))
        raise
