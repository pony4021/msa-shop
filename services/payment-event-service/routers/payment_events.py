# services/payment-event-service/routers/payment_events.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from models.payment_event import PaymentEvent
from schemas.payment_event import PaymentEventListResponse, PaymentEventResponse

router = APIRouter(tags=["payment-events"])


def serialize(event: PaymentEvent) -> PaymentEventResponse:
    return PaymentEventResponse(
        id=event.id,
        event_type=event.event_type,
        payment_id=event.payment_id,
        order_id=event.order_id,
        user_id=event.user_id,
        amount=event.amount,
        status=event.status,
        event_created_at=event.event_created_at,
        received_at=event.received_at,
    )


@router.get("/recent", response_model=PaymentEventListResponse)
async def list_recent_payment_events(
    limit: int = Query(default=20, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> PaymentEventListResponse:
    total = (await db.execute(select(func.count(PaymentEvent.id)))).scalar_one()
    rows = (
        await db.execute(
            select(PaymentEvent)
            .order_by(desc(PaymentEvent.received_at))
            .limit(limit)
        )
    ).scalars().all()
    return PaymentEventListResponse(total=total, items=[serialize(row) for row in rows])
