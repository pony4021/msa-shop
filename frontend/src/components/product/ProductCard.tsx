// frontend/src/components/product/ProductCard.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

import Badge from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { useWishlistStore } from "@/store/wishlistStore";
import { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps): JSX.Element {
  const router = useRouter();
  const soldOut = product.stock <= 0;
  const isWished = useWishlistStore((state) => state.isWished(product.id));
  const toggleItem = useWishlistStore((state) => state.toggleItem);
  const hasAuthCookie = (): boolean =>
    typeof document !== "undefined" && /(?:^|;\s*)access_token=/.test(document.cookie);
  const isSignedIn = hasAuthCookie();
  const displayWished = Boolean(isSignedIn && isWished);
  const detailHref = `/products/${product.id}`;
  const loginHref = `/login?redirect=${encodeURIComponent("/products")}&required=1`;

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => router.push(detailHref)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(detailHref);
        }
      }}
      className="group block cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.8),transparent_60%)]" />
        <div className="absolute left-3 top-3 rounded-full bg-white/85 px-2 py-1 text-xs font-semibold text-slate-700">NEW</div>
        {isSignedIn ? (
          <button
            type="button"
            aria-label={displayWished ? "찜 해제" : "찜하기"}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleItem(product);
            }}
            className={`absolute right-3 top-3 rounded-full p-2 transition ${
              displayWished ? "bg-rose-500 text-white" : "bg-white/90 text-slate-600 hover:text-rose-500"
            }`}
          >
            <Heart className={`h-4 w-4 ${displayWished ? "fill-current" : ""}`} />
          </button>
        ) : (
          <Link
            href={loginHref}
            aria-label="로그인 후 찜하기"
            onClick={(event) => event.stopPropagation()}
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-slate-600 transition hover:text-rose-500"
          >
            <Heart className="h-4 w-4" />
          </Link>
        )}
      </div>
      <div className="p-4">
        <div className="space-y-2">
          <h3 className="line-clamp-1 font-semibold text-slate-900">{product.name}</h3>
          <p className="line-clamp-2 text-sm text-slate-600">{product.description}</p>
          <p className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">{formatCurrency(product.price)}</p>
          <div className="mt-2">
            <Badge variant={soldOut ? "danger" : product.stock <= 5 ? "warning" : "success"}>
              {soldOut ? "품절" : product.stock <= 5 ? `재고 임박 ${product.stock}` : `재고 ${product.stock}`}
            </Badge>
          </div>
        </div>
      </div>
    </article>
  );
}
