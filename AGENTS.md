# AGENTS.md — AI 에이전트 구현 가이드

> 이 파일은 Codex, Claude Code 등 AI 에이전트가 프로젝트를 구현할 때 참고하는 스펙 문서입니다.

---

## 🎯 프로젝트 목표

온라인 쇼핑몰 MSA 토이 프로젝트.  
**현재 Phase**: Docker Compose 기반 로컬 환경 구축  
**다음 Phase**: Kubernetes + Istio 이관 (코드 변경 없이 인프라만 교체)

---

## ⚠️ 절대 규칙 (반드시 준수)

1. **환경변수 하드코딩 금지** → 모든 URL, 비밀키, DB 주소는 환경변수로
2. **서비스 간 직접 DB 접근 금지** → 반드시 HTTP 또는 Kafka로 통신
3. **동기 코드 작성 금지** → 모든 I/O는 `async/await`
4. **파일 경로 주석 필수** → 각 코드 블록 상단에 경로 명시

---

## 🛠 기술 스택 (고정)

```
언어:        Python 3.11
프레임워크:  FastAPI 0.111
DB:          PostgreSQL 16 + SQLAlchemy 2.0 (async) + asyncpg
마이그레이션: Alembic
캐시:        Redis 7 + redis[asyncio]
메시지큐:    Kafka (KRaft) + aiokafka
HTTP 클라이언트: httpx (AsyncClient)
설정 관리:   pydantic-settings
인증:        JWT (python-jose) + bcrypt (passlib)
```

---

## 📦 공통 requirements.txt

```
fastapi==0.111.0
uvicorn[standard]==0.29.0
sqlalchemy[asyncio]==2.0.30
asyncpg==0.29.0
alembic==1.13.1
pydantic==2.7.1
pydantic-settings==2.2.1
httpx==0.27.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
redis[asyncio]==5.0.4
aiokafka==0.10.0
python-multipart==0.0.9
```

---

## 🔧 공통 파일 패턴

### core/config.py

```python
# services/{service-name}/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    service_name: str = "{service-name}"
    database_url: str
    redis_url: str = "redis://redis:6379"
    kafka_bootstrap_servers: str = "kafka:9092"

    class Config:
        env_file = ".env"

settings = Settings()
```

### core/database.py

```python
# services/{service-name}/core/database.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from .config import settings

engine = create_async_engine(settings.database_url, echo=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
```

### core/redis.py

```python
# services/{service-name}/core/redis.py
from redis.asyncio import from_url
from .config import settings

redis_client = from_url(settings.redis_url, decode_responses=True)
```

### Dockerfile (공통)

```dockerfile
FROM python:3.11-slim AS base
WORKDIR /app

FROM base AS builder
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM base AS runtime
RUN useradd -m appuser
COPY --from=builder /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=builder /usr/local/bin /usr/local/bin
COPY . .
USER appuser
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### main.py (공통 구조)

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager
from core.database import engine, Base

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # shutdown
    await engine.dispose()

app = FastAPI(title="{Service Name}", lifespan=lifespan)

app.include_router(router, prefix="/api/{resource}")

@app.get("/health")
async def health():
    return {"status": "ok"}
```

---

## 👤 user-service

### 환경변수

```env
DATABASE_URL=postgresql+asyncpg://user:pass@user-db:5432/userdb
REDIS_URL=redis://redis:6379
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
```

### API

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/users/register` | ❌ | 회원가입 |
| POST | `/api/users/login` | ❌ | 로그인, JWT 발급 |
| GET | `/api/users/me` | ✅ JWT | 내 정보 |
| GET | `/api/users/{user_id}` | ❌ | 유저 조회 (내부 서비스용) |

### DB 모델

```python
class User(Base):
    __tablename__ = "users"
    id: UUID (PK, default=uuid4)
    email: str (unique, not null)
    username: str (not null)
    password: str (bcrypt 해싱)
    is_active: bool (default=True)
    created_at: datetime
    updated_at: datetime
```

### 비즈니스 로직

- 비밀번호: `passlib.bcrypt` 해싱
- JWT: `python-jose`, HS256, 만료 60분
- 로그인 성공 시 JWT → Redis 저장 (`jwt:{user_id}`, TTL 3600초)
- JWT 검증 시 Redis 존재 여부 함께 확인 (로그아웃 구현용)
- 이메일 중복 → 409 Conflict

---

## 🛍 product-service

### 환경변수

```env
DATABASE_URL=postgresql+asyncpg://user:pass@product-db:5432/productdb
REDIS_URL=redis://redis:6379
USER_SERVICE_URL=http://user-service:8000
```

### API

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/products/` | ❌ | 목록 (페이징) |
| GET | `/api/products/{id}` | ❌ | 상세 |
| POST | `/api/products/` | ✅ JWT | 등록 |
| PUT | `/api/products/{id}` | ✅ JWT | 수정 |
| DELETE | `/api/products/{id}` | ✅ JWT | 삭제 |

### DB 모델

```python
class Product(Base):
    __tablename__ = "products"
    id: UUID (PK)
    name: str
    description: str
    price: Decimal(10,2)
    stock: int (default=0)
    is_active: bool (default=True)
    created_at / updated_at: datetime
```

### 비즈니스 로직 (Redis 캐싱)

```
GET 목록  → key: products:list:{page}:{size}  TTL: 60초
GET 상세  → key: products:{product_id}         TTL: 300초
PUT/DELETE → 관련 캐시 전체 삭제 (cache invalidation)
```

- JWT 검증: `GET {USER_SERVICE_URL}/api/users/me` HTTP 호출로 위임
- 페이징: `?page=1&size=20`

---

## 📋 order-service

### 환경변수

```env
DATABASE_URL=postgresql+asyncpg://user:pass@order-db:5432/orderdb
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
KAFKA_TOPIC_ORDER_CREATED=order-created
USER_SERVICE_URL=http://user-service:8000
PRODUCT_SERVICE_URL=http://product-service:8000
```

### API

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/orders/` | ✅ JWT | 주문 생성 |
| GET | `/api/orders/` | ✅ JWT | 내 주문 목록 |
| GET | `/api/orders/{id}` | ✅ JWT | 주문 상세 |

### DB 모델

```python
class Order(Base):
    __tablename__ = "orders"
    id: UUID (PK)
    user_id: UUID
    status: Enum("pending", "confirmed", "cancelled")
    total_price: Decimal(10,2)
    created_at / updated_at: datetime

class OrderItem(Base):
    __tablename__ = "order_items"
    id: UUID (PK)
    order_id: UUID (FK → orders.id)
    product_id: UUID
    quantity: int
    price: Decimal(10,2)
```

### 주문 생성 플로우

```
1. JWT 검증 → user-service HTTP 호출
2. 상품 정보 조회 → product-service HTTP 호출 (httpx, timeout=5s)
3. Order + OrderItems DB 저장 (status: pending)
4. Kafka topic 'order-created' 이벤트 발행
5. 201 Created 응답
```

### Kafka 이벤트 payload

```json
{
  "event_type": "order-created",
  "order_id": "uuid",
  "user_id": "uuid",
  "items": [
    { "product_id": "uuid", "quantity": 2 }
  ],
  "created_at": "ISO8601"
}
```

### events/producer.py 패턴

```python
from aiokafka import AIOKafkaProducer
import json

async def produce_order_created(event: dict):
    producer = AIOKafkaProducer(bootstrap_servers=settings.kafka_bootstrap_servers)
    await producer.start()
    try:
        await producer.send_and_wait(
            settings.kafka_topic_order_created,
            json.dumps(event).encode()
        )
    finally:
        await producer.stop()
```

---

## 📦 inventory-service

### 환경변수

```env
DATABASE_URL=postgresql+asyncpg://user:pass@inventory-db:5432/inventorydb
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
KAFKA_TOPIC_ORDER_CREATED=order-created
KAFKA_GROUP_ID=inventory-service
```

### API

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/inventory/{product_id}` | 재고 조회 |
| POST | `/api/inventory/` | 재고 등록 |
| PUT | `/api/inventory/{product_id}` | 재고 수정 |

### DB 모델

```python
class Inventory(Base):
    __tablename__ = "inventories"
    id: UUID (PK)
    product_id: UUID (unique)
    quantity: int (default=0)
    updated_at: datetime
```

### Kafka Consumer 패턴

```python
# events/consumer.py
from aiokafka import AIOKafkaConsumer
import json, asyncio

async def consume_events():
    consumer = AIOKafkaConsumer(
        settings.kafka_topic_order_created,
        bootstrap_servers=settings.kafka_bootstrap_servers,
        group_id=settings.kafka_group_id,
    )
    await consumer.start()
    try:
        async for msg in consumer:
            event = json.loads(msg.value)
            await handle_order_created(event)
    finally:
        await consumer.stop()

# main.py lifespan에서 백그라운드 태스크로 실행
async def lifespan(app):
    asyncio.create_task(consume_events())
    yield
```

- 재고 부족 시 → 로그 기록 (보상 트랜잭션은 추후 구현)

---

## 💳 payment-service

### 환경변수

```env
DATABASE_URL=postgresql+asyncpg://user:pass@payment-db:5432/paymentdb
ORDER_SERVICE_URL=http://order-service:8000
USER_SERVICE_URL=http://user-service:8000
```

### API

| Method | Path | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/payments/` | ✅ JWT | 결제 요청 |
| GET | `/api/payments/{id}` | ✅ JWT | 결제 상태 |
| GET | `/api/payments/order/{order_id}` | ✅ JWT | 주문별 결제 조회 |

### DB 모델

```python
class Payment(Base):
    __tablename__ = "payments"
    id: UUID (PK)
    order_id: UUID (unique)    # 중복 결제 방지
    user_id: UUID
    amount: Decimal(10,2)
    status: Enum("pending", "success", "failed")
    created_at / updated_at: datetime
```

### 비즈니스 로직

- **Mock 결제**: `random.random() < 0.8` → 80% 성공
- 결제 완료 시 → order-service PATCH `/api/orders/{order_id}/status` 호출
- order_id unique constraint → 중복 결제 방지

---

## 🐳 인프라 스펙

### Redis
```yaml
image: redis:7-alpine
healthcheck: redis-cli ping
```

### Kafka (KRaft 모드, Zookeeper 없음)
```yaml
image: confluentinc/cp-kafka:7.6.0
KAFKA_PROCESS_ROLES: broker,controller
KAFKA_AUTO_CREATE_TOPICS_ENABLE: "true"
healthcheck: kafka-broker-api-versions
```

### PostgreSQL (서비스별 독립)
```yaml
image: postgres:16-alpine
healthcheck: pg_isready
# 5개 인스턴스: user-db, product-db, order-db, inventory-db, payment-db
```

---

## 🔀 Nginx 라우팅

```nginx
location /api/users/     → user-service:8000
location /api/products/  → product-service:8000
location /api/orders/    → order-service:8000
location /api/inventory/ → inventory-service:8000
location /api/payments/  → payment-service:8000
```

---

## 📋 구현 순서 (권장)

```
1. 공통 파일: core/config.py, core/database.py, core/redis.py, Dockerfile
2. user-service (전체)
3. product-service (전체)
4. order-service (전체, Kafka producer 포함)
5. inventory-service (전체, Kafka consumer 포함)
6. payment-service (전체)
7. docker-compose.yml
8. nginx/nginx.conf
```

---

## ✅ 구현 완료 기준

```bash
# 1. 전체 실행
docker compose up --build   # 에러 없이 전체 서비스 기동

# 2. 헬스체크
curl http://localhost/health                  # nginx OK
curl http://localhost:8001/health             # user-service OK
curl http://localhost:8002/health             # product-service OK

# 3. 핵심 플로우
POST /api/users/register    # 201
POST /api/users/login       # 200 + JWT 토큰
POST /api/products/         # 201 (Bearer JWT)
POST /api/orders/           # 201 → Kafka 이벤트 발행
GET  /api/inventory/{id}    # 재고 차감 확인

# 4. Swagger 접근
http://localhost:8001/docs  # 각 서비스 문서 확인
```
