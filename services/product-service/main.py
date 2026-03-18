# services/product-service/main.py
import json
import logging
import sys
from contextlib import asynccontextmanager
from decimal import Decimal

import httpx
from fastapi import FastAPI, Response
from sqlalchemy import select, text

from core.config import settings
from core.database import AsyncSessionLocal, Base, engine
from core.redis import redis_client
from models.product import Product
from routers.products import router as products_router

logger = logging.getLogger(__name__)


def _setup_logging(service_name: str) -> None:
    class _JsonFormatter(logging.Formatter):
        def format(self, record: logging.LogRecord) -> str:
            obj = {
                "timestamp": self.formatTime(record),
                "level": record.levelname,
                "logger": record.name,
                "service": service_name,
                "message": record.getMessage(),
            }
            if record.exc_info:
                obj["exc_info"] = self.formatException(record.exc_info)
            return json.dumps(obj, ensure_ascii=False)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(_JsonFormatter())
    logging.basicConfig(level=logging.INFO, handlers=[handler], force=True)


_setup_logging("product-service")


SAMPLE_PRODUCTS: list[dict[str, object]] = [
    {
        "name": "무선 블루투스 이어폰",
        "description": "노이즈 캔슬링과 고음질을 지원하는 데일리 이어폰",
        "price": Decimal("59000"),
        "stock": 42,
    },
    {
        "name": "게이밍 기계식 키보드",
        "description": "청축 스위치와 RGB 백라이트를 탑재한 키보드",
        "price": Decimal("89000"),
        "stock": 28,
    },
    {
        "name": "4K UHD 모니터 27인치",
        "description": "선명한 화질과 얇은 베젤 디자인의 고해상도 모니터",
        "price": Decimal("329000"),
        "stock": 13,
    },
    {
        "name": "무선 마우스",
        "description": "저소음 클릭과 인체공학 그립의 사무용 마우스",
        "price": Decimal("29900"),
        "stock": 65,
    },
    {
        "name": "USB-C 멀티허브",
        "description": "HDMI, USB, PD 충전을 한번에 지원하는 멀티허브",
        "price": Decimal("49000"),
        "stock": 31,
    },
    {
        "name": "스마트워치",
        "description": "심박 측정과 운동 기록 기능을 지원하는 스마트워치",
        "price": Decimal("129000"),
        "stock": 19,
    },
    {
        "name": "휴대용 블루투스 스피커",
        "description": "방수 지원과 긴 배터리 수명의 휴대용 스피커",
        "price": Decimal("69000"),
        "stock": 26,
    },
    {
        "name": "노트북 스탠드",
        "description": "높이 조절이 가능한 알루미늄 노트북 거치대",
        "price": Decimal("35000"),
        "stock": 54,
    },
    {
        "name": "외장 SSD 1TB",
        "description": "고속 전송과 안정성을 제공하는 USB 3.2 외장 SSD",
        "price": Decimal("149000"),
        "stock": 17,
    },
    {
        "name": "FHD 웹캠",
        "description": "화상회의에 최적화된 자동 초점 지원 웹캠",
        "price": Decimal("47000"),
        "stock": 33,
    },
]


async def ensure_sample_products() -> None:
    async with AsyncSessionLocal() as db:
        rename_map = {
            "Wireless Bluetooth Earbuds": "무선 블루투스 이어폰",
            "Mechanical Gaming Keyboard": "게이밍 기계식 키보드",
            "4K UHD Monitor 27inch": "4K UHD 모니터 27인치",
            "Wireless Mouse": "무선 마우스",
            "USB-C Multi Hub": "USB-C 멀티허브",
            "Smart Watch": "스마트워치",
            "Portable Bluetooth Speaker": "휴대용 블루투스 스피커",
            "Laptop Stand": "노트북 스탠드",
            "External SSD 1TB": "외장 SSD 1TB",
            "FHD Webcam": "FHD 웹캠",
        }
        existing_products = (await db.execute(select(Product))).scalars().all()
        for product in existing_products:
            if product.name in rename_map:
                product.name = rename_map[product.name]

        existing_names = set((await db.execute(select(Product.name))).scalars().all())
        missing_products = [product for product in SAMPLE_PRODUCTS if product["name"] not in existing_names]
        if not missing_products:
            await db.commit()
            return

        for product in missing_products:
            db.add(Product(**product))
        await db.commit()


async def sync_products_to_inventory() -> None:
    async with AsyncSessionLocal() as db:
        products = (await db.execute(select(Product.id, Product.stock))).all()

    headers = {"X-Internal-Secret": settings.internal_api_secret}
    async with httpx.AsyncClient(timeout=5.0) as client:
        for product_id, stock in products:
            try:
                response = await client.post(
                    f"{settings.inventory_service_url}/api/inventory/",
                    json={"product_id": str(product_id), "quantity": int(stock)},
                    headers=headers,
                )
                if response.status_code in (200, 201, 409):
                    continue
                logger.warning("inventory sync failed: product_id=%s status=%s", product_id, response.status_code)
            except httpx.HTTPError:
                logger.warning("inventory service unavailable during startup sync")
                break


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await ensure_sample_products()
    await sync_products_to_inventory()
    yield
    await engine.dispose()


app = FastAPI(title="Product Service", lifespan=lifespan)
app.include_router(products_router, prefix="/api/products")


@app.get("/health")
async def health(response: Response) -> dict:
    checks: dict[str, str] = {}
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"
    try:
        await redis_client.ping()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "error"
    overall = "ok" if all(v == "ok" for v in checks.values()) else "degraded"
    if overall != "ok":
        response.status_code = 503
    return {"status": overall, **checks}
