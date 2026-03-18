// frontend-admin/src/app/admin/page.tsx
"use client";

import DashboardStats from "@/components/admin/DashboardStats";
import Spinner from "@/components/ui/Spinner";
import { useOrders } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";

export default function AdminDashboardPage(): JSX.Element {
  const products = useProducts(1, 100);
  const orders = useOrders(true);

  if (products.isLoading || orders.isLoading) {
    return <div className="flex justify-center p-10"><Spinner className="h-8 w-8" /></div>;
  }

  if (!products.data || !orders.data) {
    return <p className="text-rose-600">대시보드 데이터를 불러오지 못했습니다.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-700 px-5 py-5 text-white shadow-soft">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-200">Admin Dashboard</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">관리자 대시보드</h1>
        <p className="mt-1 text-sm text-slate-200">스토어 상품, 주문, 재고 상태를 한눈에 확인하고 관리하세요.</p>
      </div>
      <DashboardStats products={products.data.items} orders={orders.data} />
    </div>
  );
}
