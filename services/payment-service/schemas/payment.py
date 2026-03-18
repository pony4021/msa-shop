# services/payment-service/schemas/payment.py
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

from models.payment import PaymentStatus


class PaymentCreateRequest(BaseModel):
    order_id: UUID
    # Legacy field from existing frontend payload; server-side order total is source of truth.
    amount: Decimal | None = None


class PaymentResponse(BaseModel):
    id: UUID
    order_id: UUID
    user_id: UUID
    amount: Decimal
    status: PaymentStatus
    created_at: datetime
    updated_at: datetime
