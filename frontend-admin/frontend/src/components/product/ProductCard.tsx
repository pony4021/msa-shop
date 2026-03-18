// frontend/src/components/product/ProductCard.tsx
"use client";

import Link from "next/link";

import Badge from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps): JSX.Element {
  const soldOut = product.stock <= 0;

  return (
    <Link
      href={`/products/${product.id}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.8),transparent_60%)]" />
        <div className="absolute left-3 top-3 rounded-full bg-white/85 px-2 py-1 text-xs font-semibold text-slate-700">NEW</div>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="line-clamp-1 font-semibold text-slate-900">{product.name}</h3>
        <p className="line-clamp-2 text-sm text-slate-600">{product.description}</p>
        <p className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">{formatCurrency(product.price)}</p>
        <div className="mt-2">
          <Badge variant={soldOut ? "danger" : product.stock <= 5 ? "warning" : "success"}>
            {soldOut ? "품절" : product.stock <= 5 ? `재고 임박 ${product.stock}` : `재고 ${product.stock}`}
          </Badge>
        </div>
      </div>
    </Link>
  );
}
