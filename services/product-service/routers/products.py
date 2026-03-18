# services/product-service/routers/products.py
import hmac
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from core.redis import redis_client
from models.product import Product
from schemas.product import (
    ProductCreateRequest,
    ProductListResponse,
    ProductResponse,
    ProductStockReserveRequest,
    ProductUpdateRequest,
)

router = APIRouter(tags=["products"])


async def verify_admin_token(authorization: str | None = Header(default=None)) -> None:
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header required")

    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(f"{settings.user_service_url}/api/users/me", headers={"Authorization": authorization})

    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    user_data = response.json()
    if not user_data.get("is_admin", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


async def verify_internal_or_admin(
    x_internal_secret: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
) -> None:
    if x_internal_secret and hmac.compare_digest(x_internal_secret, settings.internal_api_secret):
        return
    await verify_admin_token(authorization)


async def fetch_inventory_map(product_ids: list[UUID]) -> dict[UUID, int]:
    if not product_ids:
        return {}

    payload = {"product_ids": [str(product_id) for product_id in product_ids]}
    headers = {"X-Internal-Secret": settings.internal_api_secret}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{settings.inventory_service_url}/api/inventory/bulk",
                json=payload,
                headers=headers,
            )
    except httpx.HTTPError:
        return {}

    if response.status_code != status.HTTP_200_OK:
        return {}

    payload_data = response.json()
    stock_map: dict[UUID, int] = {}
    for item in payload_data.get("items", []):
        try:
            stock_map[UUID(item["product_id"])] = int(item["quantity"])
        except (KeyError, ValueError, TypeError):
            continue
    return stock_map


async def reserve_inventory_stocks(payload: ProductStockReserveRequest) -> None:
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="items cannot be empty")

    reserve_payload = {
        "items": [{"product_id": str(item.product_id), "quantity": item.quantity} for item in payload.items]
    }
    headers = {"X-Internal-Secret": settings.internal_api_secret}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"{settings.inventory_service_url}/api/inventory/reserve",
                json=reserve_payload,
                headers=headers,
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Inventory service unavailable") from exc

    if response.status_code in (status.HTTP_200_OK, status.HTTP_204_NO_CONTENT):
        return
    if response.status_code == status.HTTP_404_NOT_FOUND:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory not found for one or more products")
    if response.status_code == status.HTTP_409_CONFLICT:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Insufficient stock")
    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to reserve inventory stock")


async def upsert_inventory_quantity(product_id: UUID, quantity: int) -> None:
    headers = {"X-Internal-Secret": settings.internal_api_secret}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            create_response = await client.post(
                f"{settings.inventory_service_url}/api/inventory/",
                json={"product_id": str(product_id), "quantity": quantity},
                headers=headers,
            )
            if create_response.status_code in (status.HTTP_200_OK, status.HTTP_201_CREATED):
                return

            if create_response.status_code == status.HTTP_409_CONFLICT:
                update_response = await client.put(
                    f"{settings.inventory_service_url}/api/inventory/{product_id}",
                    json={"quantity": quantity},
                    headers=headers,
                )
                if update_response.status_code in (status.HTTP_200_OK, status.HTTP_204_NO_CONTENT):
                    return

            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to sync inventory")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Inventory service unavailable") from exc


@router.get("/", response_model=ProductListResponse)
async def list_products(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> ProductListResponse:
    cache_key = f"products:list:{page}:{size}"
    cached = await redis_client.get(cache_key)
    if cached:
        cached_result = ProductListResponse.model_validate_json(cached)
        cached_ids = [item.id for item in cached_result.items]
        stock_map = await fetch_inventory_map(cached_ids)
        cached_result.items = [
            item.model_copy(update={"stock": stock_map.get(item.id, item.stock)})
            for item in cached_result.items
        ]
        return cached_result

    offset = (page - 1) * size
    total = (await db.execute(select(func.count()).select_from(Product))).scalar_one()
    query = select(Product).order_by(Product.created_at.desc()).offset(offset).limit(size)
    products = (await db.execute(query)).scalars().all()
    product_ids = [product.id for product in products]
    stock_map = await fetch_inventory_map(product_ids)

    result = ProductListResponse(
        page=page,
        size=size,
        total=total,
        items=[
            ProductResponse(
                id=product.id,
                name=product.name,
                description=product.description,
                price=product.price,
                stock=stock_map.get(product.id, product.stock),
                is_active=product.is_active,
                created_at=product.created_at,
                updated_at=product.updated_at,
            )
            for product in products
        ],
    )
    await redis_client.setex(cache_key, 60, result.model_dump_json())
    return result


@router.post("/stock/reserve", status_code=status.HTTP_204_NO_CONTENT)
async def reserve_product_stocks(
    payload: ProductStockReserveRequest,
    _: None = Depends(verify_internal_or_admin),
    db: AsyncSession = Depends(get_db),
) -> Response:
    product_ids = [item.product_id for item in payload.items]
    if len(product_ids) != len(set(product_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Duplicate product IDs are not allowed")

    if product_ids:
        query = select(Product.id).where(Product.id.in_(product_ids))
        existing_ids = set((await db.execute(query)).scalars().all())
        missing_product = next((product_id for product_id in product_ids if product_id not in existing_ids), None)
        if missing_product is not None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product not found: {missing_product}")

    await reserve_inventory_stocks(payload)
    await invalidate_product_cache_many(product_ids)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: UUID, db: AsyncSession = Depends(get_db)) -> ProductResponse:
    cache_key = f"products:{product_id}"
    cached = await redis_client.get(cache_key)
    if cached:
        cached_result = ProductResponse.model_validate_json(cached)
        stock_map = await fetch_inventory_map([cached_result.id])
        return cached_result.model_copy(update={"stock": stock_map.get(cached_result.id, cached_result.stock)})

    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    stock_map = await fetch_inventory_map([product_id])
    result = ProductResponse(
        id=product.id,
        name=product.name,
        description=product.description,
        price=product.price,
        stock=stock_map.get(product.id, product.stock),
        is_active=product.is_active,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )
    await redis_client.setex(cache_key, 300, result.model_dump_json())
    return result


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreateRequest,
    _: None = Depends(verify_admin_token),
    db: AsyncSession = Depends(get_db),
) -> ProductResponse:
    product = Product(**payload.model_dump())
    db.add(product)
    await db.flush()
    await upsert_inventory_quantity(product.id, payload.stock)
    await db.commit()
    await db.refresh(product)
    await invalidate_product_cache(product.id)

    return ProductResponse(
        id=product.id,
        name=product.name,
        description=product.description,
        price=product.price,
        stock=payload.stock,
        is_active=product.is_active,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    payload: ProductUpdateRequest,
    _: None = Depends(verify_admin_token),
    db: AsyncSession = Depends(get_db),
) -> ProductResponse:
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    product.name = payload.name
    product.description = payload.description
    product.price = payload.price
    product.stock = payload.stock
    product.is_active = payload.is_active

    await upsert_inventory_quantity(product.id, payload.stock)
    await db.commit()
    await db.refresh(product)
    await invalidate_product_cache(product_id)

    return ProductResponse(
        id=product.id,
        name=product.name,
        description=product.description,
        price=product.price,
        stock=payload.stock,
        is_active=product.is_active,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: UUID,
    _: None = Depends(verify_admin_token),
    db: AsyncSession = Depends(get_db),
) -> Response:
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    await db.delete(product)
    await db.commit()
    await invalidate_product_cache(product_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


async def invalidate_product_cache(product_id: UUID) -> None:
    async for key in redis_client.scan_iter("products:list:*"):
        await redis_client.delete(key)
    await redis_client.delete(f"products:{product_id}")


async def invalidate_product_cache_many(product_ids: list[UUID]) -> None:
    async for key in redis_client.scan_iter("products:list:*"):
        await redis_client.delete(key)
    for product_id in product_ids:
        await redis_client.delete(f"products:{product_id}")

