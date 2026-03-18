// frontend/src/app/orders/[id]/page.tsx
"use client";

import { useMemo } from "react";

import OrderDetail from "@/components/order/OrderDetail";
import Spinner from "@/components/ui/Spinner";
import { useOrder } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";

interface OrderDetailPageProps {
  params: { id: string };
}

export default function OrderDetailPage({ params }: OrderDetailPageProps): JSX.Element {
  const { data, isLoading, isError } = useOrder(params.id);
  const { data: productsData } = useProducts(1, 200);

  const productNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const product of productsData?.items ?? []) {
      map[product.id] = product.name;
    }
    return map;
  }, [productsData]);

  if (isLoading) {
    return <div className="flex justify-center p-10"><Spinner className="h-8 w-8" /></div>;
  }

  if (isError || !data) {
    return <p className="text-rose-600">Failed to load order detail.</p>;
  }

  return <OrderDetail order={data} productNameMap={productNameMap} />;
}
