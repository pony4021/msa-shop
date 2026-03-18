// frontend/src/app/orders/[id]/page.tsx
"use client";

import { useQuery } from "@tanstack/react-query";

import OrderDetail from "@/components/order/OrderDetail";
import Spinner from "@/components/ui/Spinner";
import { useOrder } from "@/hooks/useOrders";
import { getProduct } from "@/lib/api/products";

interface OrderDetailPageProps {
  params: { id: string };
}

export default function OrderDetailPage({ params }: OrderDetailPageProps): JSX.Element {
  const { data, isLoading, isError } = useOrder(params.id);
  const { data: productNameMap = {} } = useQuery({
    queryKey: ["order-product-name-map", params.id, data?.updated_at ?? data?.created_at],
    enabled: Boolean(data),
    queryFn: async () => {
      const ids = Array.from(new Set((data?.items ?? []).map((item) => item.product_id)));
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const product = await getProduct(id);
            return [id, product.name] as const;
          } catch {
            return [id, id] as const;
          }
        }),
      );
      return Object.fromEntries(results) as Record<string, string>;
    },
  });

  if (isLoading) {
    return <div className="flex justify-center p-10"><Spinner className="h-8 w-8" /></div>;
  }

  if (isError || !data) {
    return <p className="text-rose-600">Failed to load order detail.</p>;
  }

  return <OrderDetail order={data} productNameMap={productNameMap} />;
}
