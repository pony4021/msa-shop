# services/inventory-service/schemas/inventory.py
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator


class InventoryCreateRequest(BaseModel):
    product_id: UUID
    quantity: int = 0


class InventoryUpdateRequest(BaseModel):
    quantity: int


class InventoryReserveItem(BaseModel):
    product_id: UUID
    quantity: int

    @field_validator("quantity")
    @classmethod
    def quantity_must_be_positive(cls, value: int) -> int:
        if value < 1:
            raise ValueError("quantity must be at least 1")
        return value


class InventoryReserveRequest(BaseModel):
    items: list[InventoryReserveItem]


class InventoryBulkRequest(BaseModel):
    product_ids: list[UUID]


class InventoryBulkItem(BaseModel):
    product_id: UUID
    quantity: int


class InventoryBulkResponse(BaseModel):
    items: list[InventoryBulkItem]


class InventoryResponse(BaseModel):
    id: UUID
    product_id: UUID
    quantity: int
    updated_at: datetime
