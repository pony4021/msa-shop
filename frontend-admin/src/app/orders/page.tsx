// frontend/src/app/orders/page.tsx
"use client";

import OrderList from "@/components/order/OrderList";
import Spinner from "@/components/ui/Spinner";
import { useOrders } from "@/hooks/useOrders";

export default function OrdersPage(): JSX.Element {
  const { data, isLoading, isError } = useOrders();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">내 주문</h1>
      {isLoading ? <div className="flex justify-center p-10"><Spinner className="h-8 w-8" /></div> : null}
      {isError ? <p className="text-rose-600">주문 목록을 불러오지 못했습니다.</p> : null}
      {data ? <OrderList orders={data} /> : null}
    </div>
  );
}
