# services/payment-event-service/schemas/payment_event.py
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class PaymentEventResponse(BaseModel):
    id: UUID
    event_type: str
    payment_id: UUID
    order_id: UUID
    user_id: UUID
    amount: Decimal
    status: str
    event_created_at: datetime
    received_at: datetime


class PaymentEventListResponse(BaseModel):
    total: int
    items: list[PaymentEventResponse]
