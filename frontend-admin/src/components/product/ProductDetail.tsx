// frontend/src/components/product/ProductDetail.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { Product } from "@/types/product";

interface ProductDetailProps {
  product: Product;
}

export default function ProductDetail({ product }: ProductDetailProps): JSX.Element {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const [quantity, setQuantity] = useState<number>(1);
  const addItem = useCartStore((state) => state.addItem);
  const soldOut = product.stock <= 0;

  const handleAddToCart = (): void => {
    const hasAuthCookie = typeof document !== "undefined" && /(?:^|;\s*)access_token=/.test(document.cookie);
    if (!isAuthenticated && !token && !hasAuthCookie) {
      router.push("/login");
      return;
    }
    addItem(product, quantity);
  };

  return (
    <section className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft md:grid-cols-2">
      <div className="relative h-80 overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200">
        <div className="absolute right-3 top-3 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-slate-700">상세보기</div>
      </div>
      <div className="space-y-4 rounded-xl bg-slate-50 p-5">
        <h1 className="text-3xl font-black tracking-tight">{product.name}</h1>
        <p className="text-slate-600">{product.description}</p>
        <p className="text-3xl font-extrabold text-slate-900">{formatCurrency(product.price)}</p>
        <Badge variant={soldOut ? "danger" : product.stock <= 5 ? "warning" : "success"}>
          {soldOut ? "품절" : product.stock <= 5 ? `재고 임박 ${product.stock}` : `재고 ${product.stock}`}
        </Badge>
        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">수량</span>
          <input
            className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2"
            type="number"
            min={1}
            max={Math.max(product.stock, 1)}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <Button disabled={soldOut} onClick={handleAddToCart}>
            장바구니 담기
          </Button>
          <Link
            href={`/orders/checkout?productId=${product.id}&quantity=${quantity}`}
            className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-700"
          >
            바로 주문
          </Link>
        </div>
      </div>
    </section>
  );
}
