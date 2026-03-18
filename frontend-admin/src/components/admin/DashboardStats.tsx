// frontend-admin/src/components/admin/DashboardStats.tsx
import { Package, ShoppingBag, AlertTriangle, BadgeCheck } from "lucide-react";

import { Order } from "@/types/order";
import { Product } from "@/types/product";

interface DashboardStatsProps {
  products: Product[];
  orders: Order[];
}

export default function DashboardStats({ products, orders }: DashboardStatsProps): JSX.Element {
  const today = new Date().toDateString();
  const todayOrders = orders.filter((order) => new Date(order.created_at).toDateString() === today).length;
  const lowStockProducts = products.filter((product) => product.stock <= 5);
  const confirmedOrders = orders.filter((order) => order.status === "confirmed").length;

  const pendingOrders = orders.filter((order) => order.status === "pending").length;

  const cards = [
    {
      title: "전체 상품",
      value: products.length,
      icon: Package,
      tone: "from-blue-500 to-cyan-500",
      bg: "bg-blue-50",
    },
    {
      title: "오늘 주문",
      value: todayOrders,
      icon: ShoppingBag,
      tone: "from-emerald-500 to-teal-500",
      bg: "bg-emerald-50",
    },
    {
      title: "결제 대기",
      value: pendingOrders,
      icon: AlertTriangle,
      tone: "from-amber-500 to-orange-500",
      bg: "bg-amber-50",
    },
    {
      title: "결제 완료",
      value: confirmedOrders,
      icon: BadgeCheck,
      tone: "from-violet-500 to-fuchsia-500",
      bg: "bg-violet-50",
    },
  ] as const;

  return (
    <div className="space-y-5">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{card.title}</p>
                <div className={`rounded-xl bg-gradient-to-br p-2 text-white ${card.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{card.value}</p>
            </article>
          );
        })}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">재고 경고 상품</h3>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
            재고 5개 이하
          </span>
        </div>
        {lowStockProducts.length === 0 ? (
          <p className="text-sm text-slate-400">현재 재고 경고 상품이 없습니다.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {lowStockProducts.slice(0, 8).map((product) => (
              <div key={product.id} className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5">
                <p className="min-w-0 truncate text-sm font-medium text-slate-800">{product.name}</p>
                <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                  product.stock === 0
                    ? "bg-rose-100 text-rose-700"
                    : "bg-amber-200 text-amber-800"
                }`}>
                  {product.stock === 0 ? "품절" : `${product.stock}개`}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
