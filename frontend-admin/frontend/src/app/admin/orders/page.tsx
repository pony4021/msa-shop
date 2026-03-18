// frontend/src/app/admin/orders/page.tsx
"use client";

import { useMemo, useState } from "react";

import OrderTable from "@/components/admin/OrderTable";
import Spinner from "@/components/ui/Spinner";
import { useOrders, useOrderMutations } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import { OrderStatus } from "@/types/order";

export default function AdminOrdersPage(): JSX.Element {
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const { data, isLoading } = useOrders();
  const { data: productsData } = useProducts(1, 200);
  const { updateStatusMutation } = useOrderMutations();

  const productNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const product of productsData?.items ?? []) {
      map[product.id] = product.name;
    }
    return map;
  }, [productsData]);

  const filtered = useMemo(() => {
    if (!data) {
      return [];
    }
    if (filter === "all") {
      return data;
    }
    return data.filter((order) => order.status === filter);
  }, [data, filter]);

  if (isLoading) {
    return <div className="flex justify-center p-10"><Spinner className="h-8 w-8" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span>Status Filter</span>
        <select className="rounded border border-slate-300 px-2 py-1" value={filter} onChange={(event) => setFilter(event.target.value as "all" | OrderStatus)}>
          <option value="all">all</option>
          <option value="pending">pending</option>
          <option value="confirmed">confirmed</option>
          <option value="cancelled">cancelled</option>
        </select>
      </div>
      <OrderTable
        orders={filtered}
        productNameMap={productNameMap}
        onUpdateStatus={(id, status) => {
          updateStatusMutation.mutate({ id, status });
        }}
      />
    </div>
  );
}
