// frontend/src/app/admin/page.tsx
"use client";

import DashboardStats from "@/components/admin/DashboardStats";
import Spinner from "@/components/ui/Spinner";
import { useOrders } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";

export default function AdminDashboardPage(): JSX.Element {
  const products = useProducts(1, 100);
  const orders = useOrders();

  if (products.isLoading || orders.isLoading) {
    return <div className="flex justify-center p-10"><Spinner className="h-8 w-8" /></div>;
  }

  if (!products.data || !orders.data) {
    return <p className="text-rose-600">대시보드 데이터를 불러오지 못했습니다.</p>;
  }

  return <DashboardStats products={products.data.items} orders={orders.data} />;
}
