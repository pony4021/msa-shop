# services/order-service/schemas/order.py
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, field_validator

from models.order import OrderStatus


class OrderCreateItem(BaseModel):
    product_id: UUID
    quantity: int

    @field_validator("quantity")
    @classmethod
    def quantity_must_be_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("수량은 1 이상이어야 합니다")
        if v > 100:
            raise ValueError("수량은 100을 초과할 수 없습니다")
        return v


class OrderCreateRequest(BaseModel):
    items: list[OrderCreateItem]

    @field_validator("items")
    @classmethod
    def no_duplicate_products(cls, v: list[OrderCreateItem]) -> list[OrderCreateItem]:
        product_ids = [item.product_id for item in v]
        if len(product_ids) != len(set(product_ids)):
            raise ValueError("중복된 상품이 포함되어 있습니다")
        return v


class OrderItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    quantity: int
    price: Decimal


class OrderResponse(BaseModel):
    id: UUID
    user_id: UUID
    status: OrderStatus
    total_price: Decimal
    items: list[OrderItemResponse]
    created_at: datetime
    updated_at: datetime


class OrderStatusUpdateRequest(BaseModel):
    status: OrderStatus
