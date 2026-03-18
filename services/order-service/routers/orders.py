# services/order-service/routers/orders.py
import hmac
import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import TypedDict
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.config import settings
from core.database import get_db
from events.producer import produce_order_created
from models.order import Order, OrderItem
from schemas.order import (
    OrderCreateRequest,
    OrderItemResponse,
    OrderResponse,
    OrderStatusUpdateRequest,
)

router = APIRouter(tags=["orders"])
logger = logging.getLogger(__name__)


class AuthUser(TypedDict):
    user_id: UUID
    is_admin: bool


async def get_current_user(authorization: str | None = Header(default=None)) -> AuthUser:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header required")

    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(f"{settings.user_service_url}/api/users/me", headers={"Authorization": authorization})

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    payload = response.json()
    return {
        "user_id": UUID(payload["user_id"]),
        "is_admin": bool(payload.get("is_admin", False)),
    }


async def get_current_user_id(current_user: AuthUser = Depends(get_current_user)) -> UUID:
    return current_user["user_id"]


async def get_product_price(product_id: UUID) -> Decimal:
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(f"{settings.product_service_url}/api/products/{product_id}")

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid product: {product_id}")

    product = response.json()
    return Decimal(str(product["price"]))


async def reserve_product_stocks(payload: OrderCreateRequest) -> None:
    reserve_payload = {
        "items": [{"product_id": str(item.product_id), "quantity": item.quantity} for item in payload.items]
    }
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.post(
            f"{settings.product_service_url}/api/products/stock/reserve",
            json=reserve_payload,
            headers={"X-Internal-Secret": settings.internal_api_secret},
        )

    if response.status_code in (200, 204):
        return

    if response.status_code == status.HTTP_404_NOT_FOUND:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid product in order items")
    if response.status_code == status.HTTP_409_CONFLICT:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Insufficient stock")

    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to reserve product stock")


async def verify_admin(current_user: AuthUser = Depends(get_current_user)) -> None:
    if not current_user["is_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")


async def verify_internal_or_admin(
    x_internal_secret: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
) -> None:
    if x_internal_secret and hmac.compare_digest(x_internal_secret, settings.internal_api_secret):
        return
    current_user = await get_current_user(authorization)
    if not current_user["is_admin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


def serialize_order(order: Order) -> OrderResponse:
    return OrderResponse(
        id=order.id,
        user_id=order.user_id,
        status=order.status,
        total_price=order.total_price,
        items=[
            OrderItemResponse(id=item.id, product_id=item.product_id, quantity=item.quantity, price=item.price)
            for item in order.items
        ],
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreateRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order items cannot be empty")

    total_price = Decimal("0")
    order_items: list[OrderItem] = []

    for item in payload.items:
        price = await get_product_price(item.product_id)
        total_price += price * item.quantity
        order_items.append(OrderItem(product_id=item.product_id, quantity=item.quantity, price=price))

    await reserve_product_stocks(payload)

    order = Order(user_id=user_id, total_price=total_price, items=order_items)
    db.add(order)
    await db.commit()

    query = select(Order).where(Order.id == order.id).options(selectinload(Order.items))
    saved = (await db.execute(query)).scalar_one()

    event = {
        "event_type": "order-created",
        "order_id": str(saved.id),
        "user_id": str(saved.user_id),
        "items": [{"product_id": str(i.product_id), "quantity": i.quantity} for i in saved.items],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await produce_order_created(event)
    except Exception:
        logger.exception("Kafka 이벤트 발행 실패: order_id=%s", saved.id)

    return serialize_order(saved)


@router.get("/", response_model=list[OrderResponse])
async def list_orders(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[OrderResponse]:
    query = (
        select(Order)
        .where(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .options(selectinload(Order.items))
    )
    orders = (await db.execute(query)).scalars().all()
    return [serialize_order(o) for o in orders]


@router.get("/admin/all", response_model=list[OrderResponse])
async def list_all_orders(
    _: None = Depends(verify_admin),
    db: AsyncSession = Depends(get_db),
) -> list[OrderResponse]:
    query = select(Order).order_by(Order.created_at.desc()).options(selectinload(Order.items))
    orders = (await db.execute(query)).scalars().all()
    return [serialize_order(o) for o in orders]


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    query = select(Order).where(Order.id == order_id).options(selectinload(Order.items))
    order = (await db.execute(query)).scalar_one_or_none()
    if not order or order.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return serialize_order(order)


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: UUID,
    payload: OrderStatusUpdateRequest,
    _: None = Depends(verify_internal_or_admin),
    db: AsyncSession = Depends(get_db),
) -> OrderResponse:
    query = select(Order).where(Order.id == order_id).options(selectinload(Order.items))
    order = (await db.execute(query)).scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    order.status = payload.status
    await db.commit()
    await db.refresh(order)
    return serialize_order(order)
