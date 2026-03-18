// frontend/src/app/wishlist/page.tsx
"use client";

import Link from "next/link";

import ProductGrid from "@/components/product/ProductGrid";
import { useWishlistStore } from "@/store/wishlistStore";

export default function WishlistPage(): JSX.Element {
  const wishedProducts = useWishlistStore((state) => state.list());

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <h1 className="text-2xl font-black text-slate-900">찜 목록</h1>
        <p className="mt-1 text-sm text-slate-600">하트로 저장한 상품을 여기서 확인할 수 있습니다.</p>
      </section>

      {wishedProducts.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-soft">
          <p className="text-sm text-slate-600">아직 찜한 상품이 없습니다.</p>
          <Link
            href="/products"
            className="mt-4 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            상품 보러가기
          </Link>
        </section>
      ) : (
        <ProductGrid products={wishedProducts} />
      )}
    </div>
  );
}

