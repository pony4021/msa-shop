# services/inventory-service/routers/inventory.py
import hmac
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from models.inventory import Inventory
from schemas.inventory import InventoryCreateRequest, InventoryResponse, InventoryUpdateRequest
from schemas.inventory import (
    InventoryBulkItem,
    InventoryBulkRequest,
    InventoryBulkResponse,
    InventoryReserveRequest,
)

router = APIRouter(tags=["inventory"])


async def verify_internal_or_admin(
    x_internal_secret: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
) -> None:
    if x_internal_secret and hmac.compare_digest(x_internal_secret, settings.internal_api_secret):
        return

    if not authorization:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(f"{settings.user_service_url}/api/users/me", headers={"Authorization": authorization})

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    payload = response.json()
    if not payload.get("is_admin", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")


def serialize(inventory: Inventory) -> InventoryResponse:
    return InventoryResponse(
        id=inventory.id,
        product_id=inventory.product_id,
        quantity=inventory.quantity,
        updated_at=inventory.updated_at,
    )


@router.get("/{product_id}", response_model=InventoryResponse)
async def get_inventory(product_id: UUID, db: AsyncSession = Depends(get_db)) -> InventoryResponse:
    query = select(Inventory).where(Inventory.product_id == product_id)
    inventory = (await db.execute(query)).scalar_one_or_none()
    if not inventory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory not found")
    return serialize(inventory)


@router.post("/", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
async def create_inventory(
    payload: InventoryCreateRequest,
    _: None = Depends(verify_internal_or_admin),
    db: AsyncSession = Depends(get_db),
) -> InventoryResponse:
    inventory = Inventory(**payload.model_dump())
    db.add(inventory)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Inventory for product already exists") from exc
    await db.refresh(inventory)
    return serialize(inventory)


@router.put("/{product_id}", response_model=InventoryResponse)
async def update_inventory(
    product_id: UUID,
    payload: InventoryUpdateRequest,
    _: None = Depends(verify_internal_or_admin),
    db: AsyncSession = Depends(get_db),
) -> InventoryResponse:
    query = select(Inventory).where(Inventory.product_id == product_id)
    inventory = (await db.execute(query)).scalar_one_or_none()
    if not inventory:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory not found")

    inventory.quantity = payload.quantity
    await db.commit()
    await db.refresh(inventory)
    return serialize(inventory)


@router.post("/bulk", response_model=InventoryBulkResponse)
async def bulk_inventory(
    payload: InventoryBulkRequest,
    _: None = Depends(verify_internal_or_admin),
    db: AsyncSession = Depends(get_db),
) -> InventoryBulkResponse:
    if not payload.product_ids:
        return InventoryBulkResponse(items=[])

    query = select(Inventory).where(Inventory.product_id.in_(payload.product_ids))
    inventories = (await db.execute(query)).scalars().all()
    item_by_product_id = {inventory.product_id: inventory.quantity for inventory in inventories}
    items = [
        InventoryBulkItem(product_id=product_id, quantity=item_by_product_id.get(product_id, 0))
        for product_id in payload.product_ids
    ]
    return InventoryBulkResponse(items=items)


@router.post("/reserve", status_code=status.HTTP_204_NO_CONTENT)
async def reserve_inventory(
    payload: InventoryReserveRequest,
    _: None = Depends(verify_internal_or_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="items cannot be empty")

    product_ids = [item.product_id for item in payload.items]
    if len(product_ids) != len(set(product_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Duplicate product IDs are not allowed")

    quantity_by_product = {item.product_id: item.quantity for item in payload.items}
    query = select(Inventory).where(Inventory.product_id.in_(product_ids)).with_for_update()
    inventories = (await db.execute(query)).scalars().all()
    inventory_map = {inventory.product_id: inventory for inventory in inventories}

    for product_id in product_ids:
        if product_id not in inventory_map:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Inventory not found: {product_id}")

    for product_id, quantity in quantity_by_product.items():
        inventory = inventory_map[product_id]
        if inventory.quantity < quantity:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Insufficient stock: {product_id}")

    for product_id, quantity in quantity_by_product.items():
        inventory_map[product_id].quantity -= quantity

    await db.commit()
