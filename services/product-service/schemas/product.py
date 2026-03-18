# services/product-service/schemas/product.py
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator


class ProductCreateRequest(BaseModel):
    name: str
    description: str
    price: Decimal
    stock: int = 0


class ProductUpdateRequest(BaseModel):
    name: str
    description: str
    price: Decimal
    stock: int
    is_active: bool


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str
    price: Decimal
    stock: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ProductListResponse(BaseModel):
    page: int
    size: int
    total: int
    items: list[ProductResponse]


class ProductStockReserveItem(BaseModel):
    product_id: UUID
    quantity: int

    @field_validator("quantity")
    @classmethod
    def quantity_must_be_positive(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Quantity must be at least 1")
        return v


class ProductStockReserveRequest(BaseModel):
    items: list[ProductStockReserveItem]
