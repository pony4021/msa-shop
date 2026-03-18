import logging
import random
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from events.producer import produce_payment_created
from models.payment import Payment, PaymentStatus
from schemas.payment import PaymentCreateRequest, PaymentResponse

router = APIRouter(tags=["payments"])
logger = logging.getLogger(__name__)


@dataclass
class CurrentUser:
    user_id: UUID
    authorization: str


@dataclass
class OrderSnapshot:
    order_id: UUID
    user_id: UUID
    total_price: Decimal
    status: str


async def get_current_user(authorization: str | None = Header(default=None)) -> CurrentUser:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header required")

    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(f"{settings.user_service_url}/api/users/me", headers={"Authorization": authorization})

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    payload = response.json()
    return CurrentUser(user_id=UUID(payload["user_id"]), authorization=authorization)


def serialize(payment: Payment) -> PaymentResponse:
    return PaymentResponse(
        id=payment.id,
        order_id=payment.order_id,
        user_id=payment.user_id,
        amount=payment.amount,
        status=payment.status,
        created_at=payment.created_at,
        updated_at=payment.updated_at,
    )


async def fetch_order_snapshot(order_id: UUID, authorization: str) -> OrderSnapshot:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.order_service_url}/api/orders/{order_id}",
                headers={"Authorization": authorization},
            )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to verify order") from exc

    if response.status_code == status.HTTP_404_NOT_FOUND:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if response.status_code == status.HTTP_401_UNAUTHORIZED:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to verify order")

    payload = response.json()
    return OrderSnapshot(
        order_id=UUID(payload["id"]),
        user_id=UUID(payload["user_id"]),
        total_price=Decimal(str(payload["total_price"])),
        status=str(payload["status"]),
    )


async def patch_order_status(order_id: UUID, status_value: str) -> None:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.patch(
                f"{settings.order_service_url}/api/orders/{order_id}/status",
                json={"status": status_value},
                headers={"X-Internal-Secret": settings.internal_api_secret},
            )
            if response.status_code not in (200, 204):
                logger.warning(
                    "Order status update failed: order_id=%s status=%s response=%s",
                    order_id,
                    status_value,
                    response.status_code,
                )
    except Exception:
        logger.exception("Order status update error: order_id=%s", order_id)


@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payload: PaymentCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentResponse:
    order = await fetch_order_snapshot(payload.order_id, current_user.authorization)
    if order.user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only pay your own order")
    if order.status != "pending":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only pending orders can be paid")

    if payload.amount is not None and payload.amount != order.total_price:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount does not match order total")

    existing = (await db.execute(select(Payment).where(Payment.order_id == payload.order_id))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Payment already exists for this order")

    payment = Payment(
        order_id=payload.order_id,
        user_id=current_user.user_id,
        amount=order.total_price,
        status=PaymentStatus.pending,
    )
    db.add(payment)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Payment already exists for this order") from exc

    success_rate = min(max(settings.payment_success_rate, 0.0), 1.0)
    is_success = random.random() < success_rate
    payment.status = PaymentStatus.success if is_success else PaymentStatus.failed
    await db.commit()
    await db.refresh(payment)

    await patch_order_status(payment.order_id, "confirmed" if is_success else "cancelled")
    event = {
        "event_type": "payment-created",
        "payment_id": str(payment.id),
        "order_id": str(payment.order_id),
        "user_id": str(payment.user_id),
        "amount": str(payment.amount),
        "status": payment.status.value,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await produce_payment_created(event)
    except Exception:
        logger.exception("Payment event publish error: payment_id=%s", payment.id)
    return serialize(payment)


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentResponse:
    payment = await db.get(Payment, payment_id)
    if not payment or payment.user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    return serialize(payment)


@router.get("/order/{order_id}", response_model=PaymentResponse)
async def get_payment_by_order(
    order_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PaymentResponse:
    query = select(Payment).where(Payment.order_id == order_id)
    payment = (await db.execute(query)).scalar_one_or_none()
    if not payment or payment.user_id != current_user.user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    return serialize(payment)
