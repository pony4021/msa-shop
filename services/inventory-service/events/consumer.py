# services/inventory-service/events/consumer.py
import json
import logging

from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

from core.config import settings

logger = logging.getLogger(__name__)

MAX_RETRIES = 3


async def handle_order_created(event: dict) -> None:
    # Stock is reserved synchronously via /api/inventory/reserve during order creation.
    # Keep Kafka consumption for observability and future async workflows.
    logger.info(
        "Received order-created event (no stock mutation): order_id=%s items=%s",
        event.get("order_id"),
        len(event.get("items", [])),
    )


async def _publish_to_dlq(producer: AIOKafkaProducer, raw_value: bytes, error: str) -> None:
    dlq_topic = f"{settings.kafka_topic_order_created}.dlq"
    try:
        dlq_payload = json.dumps({"error": error, "original": raw_value.decode(errors="replace")}).encode()
        await producer.send_and_wait(dlq_topic, dlq_payload)
        logger.warning("Event forwarded to DLQ: topic=%s", dlq_topic)
    except Exception:
        logger.exception("Failed to publish event to DLQ: topic=%s", dlq_topic)


async def consume_events() -> None:
    consumer = AIOKafkaConsumer(
        settings.kafka_topic_order_created,
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id=settings.kafka_group_id,
    )
    producer = AIOKafkaProducer(bootstrap_servers=settings.kafka_bootstrap_servers)

    await consumer.start()
    await producer.start()

    # In-memory idempotency set (prevents reprocessing within the same process lifecycle)
    processed_ids: set[str] = set()

    try:
        async for msg in consumer:
            last_error = ""
            success = False

            for attempt in range(1, MAX_RETRIES + 1):
                try:
                    event = json.loads(msg.value)
                    order_id = str(event.get("order_id", ""))

                    if order_id and order_id in processed_ids:
                        logger.info("Skipping duplicate event: order_id=%s offset=%s", order_id, msg.offset)
                        success = True
                        break

                    if event.get("event_type") == "order-created":
                        await handle_order_created(event)

                    if order_id:
                        processed_ids.add(order_id)
                        # Bound set size to prevent unbounded memory growth
                        if len(processed_ids) > 10_000:
                            processed_ids.clear()

                    success = True
                    break
                except Exception as exc:
                    last_error = str(exc)
                    logger.warning(
                        "Event processing attempt %d/%d failed: offset=%s error=%s",
                        attempt,
                        MAX_RETRIES,
                        msg.offset,
                        exc,
                    )

            if not success:
                logger.error(
                    "Event processing failed after %d attempts, sending to DLQ: offset=%s",
                    MAX_RETRIES,
                    msg.offset,
                )
                await _publish_to_dlq(producer, msg.value, last_error)
    finally:
        await consumer.stop()
        await producer.stop()
