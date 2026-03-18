// frontend/src/components/product/ProductDetail.tsx
"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { Product } from "@/types/product";

interface ProductDetailProps {
  product: Product;
}

export default function ProductDetail({ product }: ProductDetailProps): JSX.Element {
  const router = useRouter();
  const [quantity, setQuantity] = useState<number>(1);
  const [cartModalOpen, setCartModalOpen] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const toggleItem = useWishlistStore((state) => state.toggleItem);
  const isWished = useWishlistStore((state) => state.isWished(product.id));
  const soldOut = product.stock <= 0;

  const hasAuthCookie = (): boolean =>
    typeof document !== "undefined" && /(?:^|;\s*)access_token=/.test(document.cookie);
  const isSignedIn = hasAuthCookie();
  const displayWished = Boolean(isSignedIn && isWished);

  const handleAddToCart = (): void => {
    if (!hasAuthCookie()) {
      const redirect = encodeURIComponent("/orders/checkout");
      router.push(`/login?redirect=${redirect}&required=1`);
      return;
    }
    addItem(product, quantity);
    setCartModalOpen(true);
  };

  const handleBuyNow = (): void => {
    if (!hasAuthCookie()) {
      const redirect = encodeURIComponent("/orders/checkout");
      router.push(`/login?redirect=${redirect}&required=1`);
      return;
    }
    addItem(product, quantity);
    router.push("/orders/checkout");
  };

  const handleToggleWishlist = (): void => {
    if (!hasAuthCookie()) {
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/login?redirect=${redirect}&required=1`);
      return;
    }
    toggleItem(product);
  };

  return (
    <>
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
            <button
              type="button"
              onClick={handleToggleWishlist}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 transition ${
                displayWished
                  ? "border-rose-500 bg-rose-50 text-rose-600"
                  : "border-slate-300 bg-white text-slate-700 hover:border-rose-400 hover:text-rose-600"
              }`}
            >
              <Heart className={`h-4 w-4 ${displayWished ? "fill-current" : ""}`} />
              {displayWished ? "찜 완료" : "찜 하기"}
            </button>
            <Button disabled={soldOut} onClick={handleAddToCart}>
              장바구니 담기
            </Button>
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={soldOut}
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              바로 주문
            </button>
          </div>
        </div>
      </section>

      <Modal isOpen={cartModalOpen} onClose={() => setCartModalOpen(false)} title="장바구니 담기 완료" size="sm">
        <p className="text-sm text-slate-600">선택한 상품이 장바구니에 담겼습니다.</p>
        <div className="mt-4 flex gap-2">
          <Button
            className="flex-1"
            onClick={() => {
              setCartModalOpen(false);
              router.push("/orders/checkout");
            }}
          >
            장바구니 바로가기
          </Button>
          <Button className="flex-1" variant="secondary" onClick={() => setCartModalOpen(false)}>
            계속 쇼핑하기
          </Button>
        </div>
      </Modal>
    </>
  );
}
