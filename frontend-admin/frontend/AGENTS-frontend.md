# AGENTS.md — Frontend 구현 가이드

> Next.js + Tailwind CSS 기반 프론트엔드 구현 스펙.
> AI 에이전트(Codex, Claude Code)가 이 파일을 읽고 전체 프론트엔드를 구현합니다.

---

## ⚠️ 절대 규칙

1. **API URL 하드코딩 금지** → 모든 API 호출은 `NEXT_PUBLIC_API_URL` 환경변수 사용
2. **`any` 타입 사용 금지** → 모든 타입은 명시적으로 정의
3. **클라이언트 컴포넌트 최소화** → `'use client'`는 꼭 필요한 경우만
4. **파일 경로 주석 필수** → 각 코드 블록 상단에 경로 명시
5. **에러 핸들링 필수** → 모든 API 호출에 try/catch + 사용자 친화적 에러 메시지

---

## 🛠 기술 스택

| 항목 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 14 |
| 언어 | TypeScript | 5 |
| 스타일링 | Tailwind CSS | 3 |
| 상태관리 | Zustand | 4 |
| API 통신 | Axios + React Query (TanStack) | latest |
| 폼 관리 | React Hook Form + Zod | latest |
| 인증 | JWT (localStorage) | - |
| 아이콘 | lucide-react | latest |

---

## 📁 디렉토리 구조

```
frontend/
├── .env.local                       # 환경변수
├── .env.example
├── Dockerfile
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── public/
└── src/
    ├── app/                         # Next.js App Router
    │   ├── layout.tsx               # 루트 레이아웃
    │   ├── page.tsx                 # 홈 (상품 목록으로 redirect)
    │   ├── (auth)/                  # 인증 라우트 그룹
    │   │   ├── login/
    │   │   │   └── page.tsx
    │   │   └── register/
    │   │       └── page.tsx
    │   ├── products/                # 상품
    │   │   ├── page.tsx             # 상품 목록
    │   │   └── [id]/
    │   │       └── page.tsx         # 상품 상세
    │   ├── orders/                  # 주문
    │   │   ├── page.tsx             # 내 주문 목록
    │   │   ├── [id]/
    │   │   │   └── page.tsx         # 주문 상세
    │   │   └── checkout/
    │   │       └── page.tsx         # 주문/결제
    │   ├── admin/                   # 관리자
    │   │   ├── layout.tsx           # 관리자 레이아웃 (권한 체크)
    │   │   ├── page.tsx             # 대시보드
    │   │   ├── products/
    │   │   │   ├── page.tsx         # 상품 관리
    │   │   │   └── new/
    │   │   │       └── page.tsx     # 상품 등록
    │   │   ├── orders/
    │   │   │   └── page.tsx         # 주문 관리
    │   │   └── inventory/
    │   │       └── page.tsx         # 재고 관리
    │   └── api/                     # Next.js API Routes (프록시용)
    │       └── [...proxy]/
    │           └── route.ts
    ├── components/
    │   ├── layout/
    │   │   ├── Header.tsx
    │   │   ├── Footer.tsx
    │   │   └── Sidebar.tsx          # 관리자용
    │   ├── ui/                      # 공통 UI 컴포넌트
    │   │   ├── Button.tsx
    │   │   ├── Input.tsx
    │   │   ├── Modal.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Spinner.tsx
    │   │   └── Toast.tsx
    │   ├── auth/
    │   │   ├── LoginForm.tsx
    │   │   └── RegisterForm.tsx
    │   ├── product/
    │   │   ├── ProductCard.tsx
    │   │   ├── ProductGrid.tsx
    │   │   ├── ProductDetail.tsx
    │   │   └── ProductForm.tsx      # 관리자 등록/수정
    │   ├── order/
    │   │   ├── OrderList.tsx
    │   │   ├── OrderDetail.tsx
    │   │   ├── OrderItem.tsx
    │   │   └── CheckoutForm.tsx
    │   └── admin/
    │       ├── DashboardStats.tsx
    │       ├── InventoryTable.tsx
    │       └── OrderTable.tsx
    ├── hooks/                       # 커스텀 훅
    │   ├── useAuth.ts
    │   ├── useProducts.ts
    │   ├── useOrders.ts
    │   └── useInventory.ts
    ├── lib/
    │   ├── api/                     # API 클라이언트
    │   │   ├── axios.ts             # axios 인스턴스
    │   │   ├── auth.ts
    │   │   ├── products.ts
    │   │   ├── orders.ts
    │   │   ├── inventory.ts
    │   │   └── payments.ts
    │   └── utils.ts
    ├── store/                       # Zustand 전역 상태
    │   ├── authStore.ts
    │   └── cartStore.ts
    ├── types/                       # TypeScript 타입 정의
    │   ├── auth.ts
    │   ├── product.ts
    │   ├── order.ts
    │   ├── payment.ts
    │   └── inventory.ts
    └── middleware.ts                # 인증 라우트 보호
```

---

## ⚙️ 환경변수

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:80
```

---

## 📦 package.json 주요 의존성

```json
{
  "dependencies": {
    "next": "14.2.0",
    "react": "^18",
    "react-dom": "^18",
    "typescript": "^5",
    "tailwindcss": "^3",
    "axios": "^1.7.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.5.0",
    "react-hook-form": "^7.51.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.3.4",
    "lucide-react": "^0.372.0",
    "clsx": "^2.1.1"
  }
}
```

---

## 🔧 공통 파일 패턴

### lib/api/axios.ts

```typescript
// src/lib/api/axios.ts
import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 5000,
})

// 요청 인터셉터: JWT 자동 첨부
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 응답 인터셉터: 401 시 로그인 페이지 이동
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

### types/ 전체 정의

```typescript
// src/types/auth.ts
export interface User {
  id: string
  email: string
  username: string
  is_active: boolean
  created_at: string
}

export interface LoginRequest { email: string; password: string }
export interface LoginResponse { access_token: string; token_type: string }
export interface RegisterRequest { email: string; username: string; password: string }

// src/types/product.ts
export interface Product {
  id: string
  name: string
  description: string
  price: number
  stock: number
  is_active: boolean
  created_at: string
}

export interface ProductListResponse {
  items: Product[]
  total: number
  page: number
  size: number
}

export interface CreateProductRequest {
  name: string
  description: string
  price: number
  stock: number
}

// src/types/order.ts
export type OrderStatus = 'pending' | 'confirmed' | 'cancelled'

export interface OrderItem {
  id: string
  product_id: string
  quantity: number
  price: number
}

export interface Order {
  id: string
  user_id: string
  status: OrderStatus
  total_price: number
  items: OrderItem[]
  created_at: string
}

export interface CreateOrderRequest {
  items: { product_id: string; quantity: number }[]
}

// src/types/payment.ts
export type PaymentStatus = 'pending' | 'success' | 'failed'

export interface Payment {
  id: string
  order_id: string
  amount: number
  status: PaymentStatus
  created_at: string
}

// src/types/inventory.ts
export interface Inventory {
  id: string
  product_id: string
  quantity: number
  updated_at: string
}
```

### store/authStore.ts

```typescript
// src/store/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/types/auth'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        localStorage.setItem('access_token', token)
        set({ user, token, isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem('access_token')
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    { name: 'auth-store' }
  )
)
```

### store/cartStore.ts

```typescript
// src/store/cartStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Product } from '@/types/product'

interface CartItem extends Product { quantity: number }

interface CartState {
  items: CartItem[]
  addItem: (product: Product, quantity: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  totalPrice: () => number
  totalCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity) => {
        const existing = get().items.find(i => i.id === product.id)
        if (existing) {
          set({ items: get().items.map(i =>
            i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i
          )})
        } else {
          set({ items: [...get().items, { ...product, quantity }] })
        }
      },
      removeItem: (id) => set({ items: get().items.filter(i => i.id !== id) }),
      updateQuantity: (id, qty) => set({ items: get().items.map(i =>
        i.id === id ? { ...i, quantity: qty } : i
      )}),
      clearCart: () => set({ items: [] }),
      totalPrice: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      totalCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'cart-store' }
  )
)
```

### middleware.ts (라우트 보호)

```typescript
// src/middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_ROUTES = ['/orders', '/admin']
const ADMIN_ROUTES = ['/admin']
const AUTH_ROUTES = ['/login', '/register']

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED_ROUTES.some(r => pathname.startsWith(r))
  const isAdmin = ADMIN_ROUTES.some(r => pathname.startsWith(r))
  const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r))

  if (isProtected && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/products', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/orders/:path*', '/admin/:path*', '/login', '/register'],
}
```

---

## 📄 페이지별 구현 스펙

### 1. 로그인 `/login`

**구현 항목**
- React Hook Form + Zod 유효성 검사
- 로그인 성공 시 JWT → authStore 저장 + `/products` redirect
- 에러 메시지 인라인 표시
- "회원가입" 링크

**Zod 스키마**
```typescript
const loginSchema = z.object({
  email: z.string().email('올바른 이메일을 입력하세요'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다'),
})
```

**API 호출**
```
POST /api/users/login   { email, password }
→ { access_token, token_type }
```

---

### 2. 회원가입 `/register`

**구현 항목**
- 이메일, 사용자명, 비밀번호, 비밀번호 확인
- Zod로 비밀번호 일치 여부 검사
- 가입 성공 시 `/login` redirect

**Zod 스키마**
```typescript
const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2, '2자 이상 입력하세요'),
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
})
```

**API 호출**
```
POST /api/users/register   { email, username, password }
→ 201 Created
```

---

### 3. 상품 목록 `/products`

**구현 항목**
- React Query로 상품 목록 fetch + 캐싱
- 페이지네이션 (`?page=1&size=12`)
- 상품 카드 그리드 (3열 반응형)
- 로딩 스켈레톤 UI
- "장바구니 담기" 버튼 → cartStore에 추가

**ProductCard 구성 요소**
```
상품 이미지 (placeholder)
상품명
가격 (원화 포맷: toLocaleString)
재고 상태 뱃지 (stock > 0 → 초록, 0 → 빨강)
"장바구니 담기" 버튼
```

**API 호출**
```
GET /api/products/?page=1&size=12
→ { items: Product[], total, page, size }
```

---

### 4. 상품 상세 `/products/[id]`

**구현 항목**
- 상품 정보 전체 표시
- 수량 선택 (1 ~ stock 범위)
- "장바구니 담기" 버튼 → cartStore 추가
- "바로 주문" 버튼 → `/orders/checkout?productId=xxx&quantity=1`
- 로딩 스켈레톤

**API 호출**
```
GET /api/products/{id}
→ Product
```

---

### 5. 주문/결제 `/orders/checkout`

**구현 항목**
- cartStore 기반 주문서 표시 (상품명, 수량, 금액)
- 주문 금액 합계
- "주문 확인" 버튼 → 주문 생성 API
- 주문 생성 성공 시 → 결제 API 자동 호출
- 결제 성공/실패 모달 표시
- 성공 시 cartStore 초기화 → `/orders/{id}` redirect

**플로우**
```
1. POST /api/orders/    → { order_id }
2. POST /api/payments/  → { status: 'success' | 'failed' }
3. success → 모달 → /orders/{order_id}
   failed  → 실패 모달 + 재시도 버튼
```

---

### 6. 내 주문 목록 `/orders`

**구현 항목**
- 로그인 필수 (middleware로 보호)
- React Query로 주문 목록 fetch
- 주문 상태 뱃지: `pending` 회색 / `confirmed` 초록 / `cancelled` 빨강
- 각 주문 클릭 시 → `/orders/{id}`

**API 호출**
```
GET /api/orders/   (Bearer JWT)
→ Order[]
```

---

### 7. 관리자 대시보드 `/admin`

**구현 항목**
- 사이드바 네비게이션 (대시보드 / 상품관리 / 주문관리 / 재고관리)
- 통계 카드 4개:
  - 전체 상품 수
  - 오늘 주문 수
  - 재고 부족 상품 수 (stock ≤ 5)
  - 결제 성공 건수

---

### 8. 관리자 상품 관리 `/admin/products`

**구현 항목**
- 상품 목록 테이블 (이름, 가격, 재고, 상태, 액션)
- 상품 등록 버튼 → `/admin/products/new`
- 수정 버튼 → 인라인 모달
- 삭제 버튼 → 확인 다이얼로그
- React Query `invalidateQueries`로 목록 자동 갱신

**API 호출**
```
GET    /api/products/           → 목록
POST   /api/products/           → 등록 (Bearer JWT)
PUT    /api/products/{id}       → 수정 (Bearer JWT)
DELETE /api/products/{id}       → 삭제 (Bearer JWT)
```

---

### 9. 관리자 주문 관리 `/admin/orders`

**구현 항목**
- 전체 주문 테이블 (주문ID, 유저ID, 금액, 상태, 날짜)
- 상태별 필터 (전체 / pending / confirmed / cancelled)
- 주문 상태 변경 드롭다운

---

### 10. 관리자 재고 관리 `/admin/inventory`

**구현 항목**
- 상품별 재고 테이블 (상품ID, 현재 재고, 마지막 업데이트)
- 재고 수량 인라인 수정
- 재고 부족 (≤ 5) 행 강조 표시

**API 호출**
```
GET /api/inventory/{product_id}
PUT /api/inventory/{product_id}   { quantity }
```

---

## 🧩 공통 UI 컴포넌트 스펙

### Button.tsx
```typescript
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: React.ReactNode
}
// loading=true 시 Spinner 표시, disabled 처리
```

### Input.tsx
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string    // 에러 메시지 빨간색으로 표시
  hint?: string
}
```

### Badge.tsx
```typescript
type BadgeVariant = 'success' | 'warning' | 'danger' | 'default'
// pending → default(회색)
// confirmed → success(초록)
// cancelled → danger(빨강)
// stock ≤ 5 → warning(주황)
```

### Modal.tsx
```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}
// 배경 클릭 시 닫기, ESC 키 닫기 지원
```

### Toast.tsx
```typescript
// 우측 하단 고정 표시
// 3초 후 자동 소멸
type ToastType = 'success' | 'error' | 'info'
```

---

## 🐳 Dockerfile

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

FROM base AS runtime
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER appuser
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

---

## 🐳 docker-compose 추가 서비스

기존 `docker-compose.yml`에 아래 추가:

```yaml
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://nginx:80
    depends_on:
      - nginx
    networks:
      - msa-network
    restart: unless-stopped
```

---

## ✅ 구현 완료 기준

```bash
# 1. 실행
docker compose up --build

# 2. 접근
http://localhost:3000              # 프론트엔드

# 3. 핵심 플로우 확인
회원가입 → 로그인 → JWT 저장 확인
상품 목록 → 상세 → 장바구니 담기
장바구니 → 주문/결제 → 결제 결과 모달
내 주문 목록 → 상세 확인
관리자 → 상품 등록 → 목록 갱신 확인
관리자 → 재고 수정 → 반영 확인
```

---

## 📋 구현 순서 (권장)

```
1. 환경 셋업: next.config.ts, tailwind.config.ts, tsconfig.json
2. types/ 전체 타입 정의
3. lib/api/axios.ts + 각 서비스별 API 함수
4. store/authStore.ts + store/cartStore.ts
5. components/ui/ 공통 컴포넌트 (Button, Input, Badge, Modal, Toast)
6. middleware.ts (라우트 보호)
7. components/layout/ (Header, Footer, Sidebar)
8. 인증 페이지: /login, /register
9. 상품 페이지: /products, /products/[id]
10. 주문/결제: /orders/checkout, /orders, /orders/[id]
11. 관리자: /admin, /admin/products, /admin/orders, /admin/inventory
12. Dockerfile + docker-compose 연동
```
