# Shop MSA

온라인 쇼핑몰 마이크로서비스 토이 프로젝트입니다.
Docker Compose 로컬 환경으로 바로 실행 가능하며, EKS + Istio 전환 구조를 함께 유지합니다.

---

## 목차

1. [아키텍처 개요](#1-아키텍처-개요)
2. [로컬 실행](#2-로컬-실행)
3. [서비스 상세](#3-서비스-상세)
4. [Kafka 이벤트 흐름](#4-kafka-이벤트-흐름)
5. [보안 설계](#5-보안-설계)
6. [개선 이력](#6-개선-이력)
7. [EKS + Istio 전환](#7-eks--istio-전환진행-중)
8. [빠른 검증 / 트러블슈팅](#8-빠른-검증--트러블슈팅)

---

## 1. 아키텍처 개요

### 전체 요청 흐름

```
브라우저
  │
  ├── GET /          → frontend (Next.js, 일반 사용자)
  ├── GET /admin     → frontend-admin (Next.js, 관리자)
  └── POST /api/**   → 각 백엔드 마이크로서비스
        │
       Nginx (API Gateway, port 3333)
        │
        ├── /api/users/          → user-service:8000
        ├── /api/products/       → product-service:8000
        ├── /api/orders/         → order-service:8000
        ├── /api/inventory/      → inventory-service:8000
        ├── /api/payments/       → payment-service:8000
        └── /api/payment-events/ → payment-event-service:8000
```

### 서비스 간 통신 구조

```
[user-service]──────────────────────────────────────────────────────────────
      │ JWT 발급 / /me 검증 엔드포인트 제공
      │
      ├── product-service ──(REST)──▶ inventory-service  (재고 조회/예약)
      │        │
      │        └── Redis (목록/상세 캐시, TTL 60s/300s)
      │
      ├── order-service ────(REST)──▶ product-service    (가격 조회)
      │        │               ──▶ inventory-service  (재고 예약)
      │        │
      │        └──(Kafka: order-created)──────────────────▶ inventory-service
      │                                                              │ DLQ: order-created.dlq
      │
      └── payment-service──(REST)──▶ order-service       (주문 상태 변경)
               │
               └──(Kafka: payment-created)──────────────▶ payment-event-service
```

### 인프라 구성

| 컴포넌트 | 용도 | 포트 |
|---------|------|------|
| Nginx | API Gateway, 프론트엔드 라우팅 | 3333 |
| PostgreSQL × 6 | 서비스별 독립 DB | 5432 |
| Redis | 상품 캐시, JWT 세션 저장 | 6379 |
| Kafka (KRaft) | 비동기 이벤트 브로커 | 9092 |

---

## 2. 로컬 실행

### 사전 준비

- Docker Desktop (권장 메모리 6GB 이상)

### 환경 변수 설정

```bash
cp .env.example .env
```

`.env`에서 반드시 설정해야 할 항목:

| 변수 | 설명 |
|------|------|
| `JWT_SECRET_KEY` | JWT 서명 키 (충분히 긴 랜덤 문자열) |
| `INTERNAL_API_SECRET` | 서비스 간 내부 호출 인증 키 |
| `ADMIN_EMAIL` | 초기 관리자 이메일 |
| `ADMIN_PASSWORD` | 초기 관리자 비밀번호 (8자 이상) |
| `ADMIN_USERNAME` | 초기 관리자 이름 |

### 실행

```bash
docker compose up -d --build
```

### 접속 URL

| 대상 | URL |
|------|-----|
| 일반 사용자 쇼핑몰 | `http://localhost:3333` |
| 관리자 페이지 | `http://localhost:3333/admin` |
| 헬스체크 | `http://localhost:3333/health` |

외부 단말에서 접속 시: `http://<host-ip>:3333`

---

## 3. 서비스 상세

### 3.1 user-service

**역할**: 회원가입·로그인·JWT 발급, 다른 서비스의 인증 검증 창구

| API | 설명 |
|-----|------|
| `POST /api/users/register` | 회원가입 (이메일, 비밀번호 8자 이상) |
| `POST /api/users/login` | 로그인 → JWT 발급 |
| `GET /api/users/me` | 토큰 검증 + 유저 정보 반환 |
| `GET /api/users/{user_id}` | 유저 정보 조회 (서비스 내부용) |

**동작 흐름**:
1. 로그인 성공 시 JWT 생성 + Redis에 세션 저장 (TTL)
2. 다른 서비스가 `/api/users/me`를 호출하여 토큰 유효성 검증
3. JWT payload에 `is_admin` 포함 → 서비스별 권한 분기
4. 서버 시작 시 환경변수 기반 관리자 계정 자동 생성/갱신

---

### 3.2 product-service

**역할**: 상품 CRUD, 목록/상세 Redis 캐싱, 재고 연계

| API | 설명 |
|-----|------|
| `GET /api/products/?page=1&size=12` | 상품 목록 (캐시 60초) |
| `GET /api/products/{id}` | 상품 상세 (캐시 300초) |
| `POST /api/products/` | 상품 등록 (관리자) |
| `PUT /api/products/{id}` | 상품 수정 (관리자) |
| `DELETE /api/products/{id}` | 상품 삭제 (관리자) |
| `POST /api/products/stock/reserve` | 재고 예약 (내부) |

**동작 흐름**:
1. 상품 조회 시 Redis 캐시 우선 확인 → 없으면 DB 조회 후 캐싱
2. 재고는 항상 inventory-service에서 실시간 조회 (캐시와 분리)
3. 상품 수정/삭제 시 `scan_iter`로 관련 캐시 키 전체 무효화
4. 서버 시작 시 샘플 상품 10개 자동 생성 + inventory-service에 재고 동기화

---

### 3.3 order-service

**역할**: 주문 생성·조회, 재고 예약, Kafka 이벤트 발행

| API | 설명 |
|-----|------|
| `POST /api/orders/` | 주문 생성 |
| `GET /api/orders/` | 내 주문 목록 |
| `GET /api/orders/{id}` | 주문 상세 |
| `PATCH /api/orders/{id}/status` | 주문 상태 변경 (내부/관리자) |
| `GET /api/orders/admin/all` | 전체 주문 목록 (관리자) |

**주문 생성 흐름**:
```
클라이언트
  1. POST /api/orders/ (Authorization 헤더)
  2. user-service /me → JWT 검증
  3. product-service → 각 상품 가격 조회
  4. inventory-service → 재고 예약 (FOR UPDATE 비관적 락)
  5. orders DB 저장
  6. Kafka order-created 발행 (singleton producer)
```

---

### 3.4 inventory-service

**역할**: 재고 관리, `order-created` Kafka 이벤트 소비

| API | 설명 |
|-----|------|
| `GET /api/inventory/{product_id}` | 재고 조회 |
| `POST /api/inventory/` | 재고 생성 (내부) |
| `PUT /api/inventory/{product_id}` | 재고 직접 수정 (내부/관리자) |
| `POST /api/inventory/bulk` | 복수 상품 재고 일괄 조회 (내부) |
| `POST /api/inventory/reserve` | 재고 예약 (내부, FOR UPDATE 락) |

**Kafka Consumer 동작**:
```
order-created 토픽
  → 최대 3회 재시도
  → 성공: order_id를 processed_ids에 기록 (멱등성 보장)
  → 3회 실패: order-created.dlq 토픽으로 전송 (DLQ)
```

> **참고**: 재고 차감은 주문 생성 시 `/reserve` REST 동기 호출로 처리됩니다.
> Kafka consumer는 관측성 및 미래 비동기 워크플로우 확장 포인트로 활용됩니다.

---

### 3.5 payment-service

**역할**: 결제 처리, 주문 상태 업데이트, Kafka 이벤트 발행

| API | 설명 |
|-----|------|
| `POST /api/payments/` | 결제 요청 |
| `GET /api/payments/{id}` | 결제 내역 조회 |
| `GET /api/payments/order/{order_id}` | 주문별 결제 조회 |

**결제 흐름**:
```
POST /api/payments/
  1. order-service → 주문 확인 (소유권, 상태=pending 검증)
  2. payments DB에 pending 상태 저장 (중복 결제 방지)
  3. Mock 결제 처리 (환경변수 PAYMENT_SUCCESS_RATE 확률)
  4. 결제 결과(success/failed) DB 업데이트
  5. order-service PATCH → 주문 상태 confirmed/cancelled 변경
  6. Kafka payment-created 발행 (singleton producer)
```

---

### 3.6 payment-event-service

**역할**: `payment-created` 이벤트 소비 및 이력 저장

| API | 설명 |
|-----|------|
| `GET /api/payment-events/recent?limit=20` | 최근 결제 이벤트 조회 |

**동작**: Consumer Group `payment-event-service`로 토픽 구독 → 이벤트 upsert 저장

---

## 4. Kafka 이벤트 흐름

### 토픽 구성

| 토픽 | 생산자 | 소비자 |
|------|--------|--------|
| `order-created` | order-service | inventory-service |
| `order-created.dlq` | inventory-service (DLQ) | - (수동 처리용) |
| `payment-created` | payment-service | payment-event-service |

### 이벤트 페이로드

**order-created**
```json
{
  "event_type": "order-created",
  "order_id": "uuid",
  "user_id": "uuid",
  "items": [{"product_id": "uuid", "quantity": 2}],
  "created_at": "2024-01-01T00:00:00Z"
}
```

**payment-created**
```json
{
  "event_type": "payment-created",
  "payment_id": "uuid",
  "order_id": "uuid",
  "user_id": "uuid",
  "amount": "59000",
  "status": "success",
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Kafka 상태 점검

```bash
# 토픽 목록
docker compose exec kafka kafka-topics --bootstrap-server kafka:9092 --list

# Consumer Group 지연(lag) 확인
docker compose exec kafka kafka-consumer-groups --bootstrap-server kafka:9092 \
  --describe --group inventory-service
docker compose exec kafka kafka-consumer-groups --bootstrap-server kafka:9092 \
  --describe --group payment-event-service

# DLQ 메시지 확인
docker compose exec kafka kafka-console-consumer --bootstrap-server kafka:9092 \
  --topic order-created.dlq --from-beginning
```

---

## 5. 보안 설계

### 서비스 간 인증 (`X-Internal-Secret`)

외부에 노출되면 안 되는 내부 API(`/reserve`, `/bulk`, `/status` 등)는 `X-Internal-Secret` 헤더로 보호합니다.

- 타이밍 공격 방지를 위해 `hmac.compare_digest`로 비교
- 환경변수 `INTERNAL_API_SECRET`으로 주입 (기본값 없음)

```
order-service ──X-Internal-Secret──▶ inventory-service /reserve
payment-service ──X-Internal-Secret──▶ order-service /status
product-service ──X-Internal-Secret──▶ inventory-service /bulk
```

### JWT + Redis 이중 검증

1. JWT 서명 검증 (secret key)
2. Redis 세션 존재 여부 확인 (로그아웃 시 즉시 무효화 가능)
3. JWT payload에 `is_admin` 포함 → 관리자 기능 분기

### 프론트엔드 세션 분리

| 프론트엔드 | 쿠키명 | localStorage 키 |
|-----------|--------|----------------|
| 일반 사용자 (`frontend`) | `access_token` | `auth-store` |
| 관리자 (`frontend-admin`) | `admin_access_token` | `admin-auth-store` |

두 앱이 동일한 nginx origin(`:3333`)을 공유하므로 쿠키 이름을 분리하여 세션 충돌 방지.

### /health 의존성 체크

각 서비스 `/health` 엔드포인트는 실제 의존성 상태를 반환합니다. 이상 감지 시 HTTP 503 반환.

| 서비스 | 체크 항목 |
|--------|---------|
| user-service | DB 연결 |
| product-service | DB 연결, Redis ping |
| order-service | DB 연결, Kafka producer 상태 |
| payment-service | DB 연결, Kafka producer 상태 |
| inventory-service | DB 연결, Consumer 태스크 생존 여부 |

응답 예시:
```json
{ "status": "ok", "database": "ok", "redis": "ok" }
{ "status": "degraded", "database": "ok", "redis": "error" }
```

---

## 6. 개선 이력

### 보안

| 항목 | 변경 전 | 변경 후 |
|------|--------|--------|
| 내부 시크릿 비교 | `==` 단순 비교 | `hmac.compare_digest` (타이밍 공격 방지) |
| 관리자 권한 체크 | 없음 (모든 인증 사용자 가능) | `is_admin` JWT 클레임 검증 |
| 상품 수정 | `setattr` 동적 할당 (mass assignment 위험) | 허용 필드만 명시적 업데이트 |
| 프론트 세션 | 단일 쿠키 (`access_token`) | 앱별 분리 쿠키 |
| JWT 기본값 | 하드코딩 기본값 존재 | 필수 환경변수로 변경 |

### 안정성

| 항목 | 변경 전 | 변경 후 |
|------|--------|--------|
| Kafka Producer | 메시지마다 start/stop | Singleton (lifespan 관리) |
| Kafka Consumer | 에러 시 consumer 크래시 | try-except + 최대 3회 재시도 |
| Kafka Consumer | DLQ 없음 | 처리 실패 이벤트 → `*.dlq` 토픽 발행 |
| Kafka Consumer | 중복 처리 가능 | order_id 기반 in-memory 멱등성 |
| 재고 예약 | 경쟁 조건 가능 | `SELECT ... FOR UPDATE` 비관적 락 |
| DB 제약 | 없음 | `CHECK (quantity >= 0)` 제약 추가 |
| 캐시 무효화 | `KEYS *` (블로킹) | `SCAN ITER` (논블로킹) |
| 페이지네이션 | 총 개수 없음 | `total` 필드 포함 응답 |

### 관측성

| 항목 | 변경 전 | 변경 후 |
|------|--------|--------|
| 로그 형식 | 일반 텍스트 | JSON 구조화 로그 (`timestamp`, `level`, `logger`, `service`, `message`) |
| `/health` | `{"status": "ok"}` 고정 반환 | DB/Redis/Kafka 실제 연결 상태 확인 후 반환 |

---

## 7. EKS + Istio 전환(진행 중)

### 목표 스택

| 영역 | 기술 |
|------|------|
| 인프라 프로비저닝 | Terraform (`infra/eks/terraform`) |
| CI | GitHub Actions (빌드 → ECR 푸시) |
| CD | Argo CD (GitOps) |
| Ingress | Istio IngressGateway (NLB) |
| DNS | Route53 |
| 관측성 | Prometheus + Grafana + Kiali |

### 데이터 계층 (EKS)

| 컴포넌트 | EKS 구성 |
|---------|---------|
| PostgreSQL | RDS 1 인스턴스 + 서비스별 논리 DB |
| Redis | EFS PVC |
| Kafka | EBS(gp3) PVC |

### Argo CD 앱 구성

```
argocd/apps/
├── root-app.yaml                       # App of Apps 루트
├── platform-app.yaml                   # 인프라 플랫폼
├── shop-msa-dev-app.yaml               # 애플리케이션 (dev)
├── observability-prometheus-app.yaml   # Prometheus + Grafana
└── observability-kiali-app.yaml        # Kiali
```

> **주의**: `repoURL`의 `REPLACE_ME` 및 `<aws_account_id>` 는 실제 값으로 치환 필요

### 개발/운영 도메인

- `https://yourdomain.example.com` — 서비스
- `https://yourdomain.example.com/grafana` — 대시보드
- `https://yourdomain.example.com/kiali` — 서비스 메시 시각화

---

## 8. 빠른 검증 / 트러블슈팅

### 전체 상태 확인

```bash
docker compose ps
curl http://localhost:3333/health

# 각 서비스 헬스 직접 확인 (의존성 포함)
curl http://localhost:3333/api/users/health
curl http://localhost:3333/api/products/health
curl http://localhost:3333/api/orders/health
curl http://localhost:3333/api/payments/health
curl http://localhost:3333/api/inventory/health
```

### EKS 상태 확인

```bash
kubectl get nodes
kubectl get pods -n shop-msa-app
kubectl get pods -n shop-msa-platform
kubectl get pvc -n shop-msa-app
```

### 주요 트러블슈팅

**404/502 응답**
```bash
docker compose ps
docker compose logs --tail=200 nginx
```

**Kafka 이벤트 누락**
```bash
docker compose logs --tail=200 order-service
docker compose logs --tail=200 inventory-service
docker compose logs --tail=200 payment-service
docker compose logs --tail=200 payment-event-service

# DLQ 메시지 확인 (처리 실패한 이벤트)
docker compose exec kafka kafka-console-consumer \
  --bootstrap-server kafka:9092 --topic order-created.dlq --from-beginning
```

**결제 성공률 조정**
```bash
# .env에서 설정 (0.0 ~ 1.0)
PAYMENT_SUCCESS_RATE=0.8
docker compose up -d payment-service
```

**EKS 배포 실패**
- Argo CD Sync 상태 확인
- `REPLACE_ME`, `<aws_account_id>`, `dev-<gitsha>` 치환 여부 확인
- Istio Gateway `credentialName` TLS Secret 확인

---

## 관련 문서

- 배포 순서/체크리스트: [infra.md](./infra.md)
- Argo CD 앱 설명: [argocd/apps/README.md](./argocd/apps/README.md)
