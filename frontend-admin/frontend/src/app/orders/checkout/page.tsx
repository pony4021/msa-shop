// frontend/src/app/orders/checkout/page.tsx
"use client";

import { Minus, Plus, Trash2 } from "lucide-react";

import CheckoutForm from "@/components/order/CheckoutForm";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";

export default function CheckoutPage(): JSX.Element {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <h1 className="text-2xl font-bold">주문/결제</h1>

      <div className="grid gap-6 md:grid-cols-[1fr_380px]">
        {/* 왼쪽: 장바구니 아이템 목록 */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-slate-700">장바구니 ({items.length}종)</h2>

          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
              <p>장바구니가 비어 있습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4"
                >
                  {/* 상품 썸네일 플레이스홀더 */}
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200" />

                  {/* 상품 정보 */}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-medium text-slate-900">{item.name}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{formatCurrency(item.price)} / 개</p>
                    <p className="mt-1 text-xs text-slate-400">재고 {item.stock}개</p>
                  </div>

                  {/* 수량 조절 */}
                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-1">
                    <button
                      type="button"
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={item.quantity <= 1}
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label="수량 감소"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={item.quantity >= item.stock}
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      aria-label="수량 증가"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* 소계 */}
                  <div className="w-24 text-right">
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>

                  {/* 삭제 */}
                  <button
                    type="button"
                    className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                    onClick={() => removeItem(item.id)}
                    aria-label="상품 삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 오른쪽: 결제 폼 */}
        <aside className="space-y-3">
          <h2 className="text-base font-semibold text-slate-700">결제 정보</h2>
          <CheckoutForm />
        </aside>
      </div>
    </div>
  );
}
