// frontend/src/app/products/page.tsx
"use client";

import { useState } from "react";

import ProductGrid from "@/components/product/ProductGrid";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import { useProducts } from "@/hooks/useProducts";

export default function ProductsPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const size = 12;
  const { data, isLoading, isError } = useProducts(page, size);

  const isLastPage = data ? page * size >= data.total : false;

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
        <div className="grid gap-4 p-6 md:grid-cols-[1.4fr_1fr] md:p-8">
          <div>
            <p className="text-sm font-semibold text-brand-700">SEASONAL PICKS</p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight text-slate-900 md:text-4xl">
              오늘의 추천 상품으로
              <br />
              스마트한 쇼핑 시작
            </h1>
            <p className="mt-3 text-sm text-slate-600">빠른 배송, 안정적인 결제, 실시간 주문 추적까지 한번에.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["신상품", "무료배송", "특가", "재고임박"].map((chip) => (
                <span key={chip} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {chip}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-brand-100 via-white to-amber-100 p-4">
            <p className="text-sm text-slate-700">이번 주 혜택</p>
            <p className="mt-2 text-2xl font-black text-slate-900">최대 20% 쿠폰</p>
            <p className="mt-1 text-sm text-slate-600">장바구니 5만원 이상 결제 시 자동 적용</p>
          </div>
        </div>
      </section>

      {/* 총 상품 수 */}
      {data && (
        <p className="text-sm text-slate-500">
          총 <span className="font-semibold text-slate-900">{data.total}</span>개 상품
        </p>
      )}

      {/* 로딩 skeleton */}
      {isLoading ? <ProductGridSkeleton /> : null}

      {/* 에러 */}
      {isError ? <p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-600">상품을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p> : null}

      {/* 상품 그리드 */}
      {data ? <ProductGrid products={data.items} /> : null}

      {/* 페이지네이션 */}
      <div className="flex items-center justify-center gap-3">
        <button
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={page <= 1}
          onClick={() => setPage((prev) => prev - 1)}
          type="button"
        >
          이전
        </button>
        <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">{page}</span>
        <button
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm hover:border-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLastPage}
          onClick={() => setPage((prev) => prev + 1)}
          type="button"
        >
          다음
        </button>
      </div>
    </div>
  );
}
