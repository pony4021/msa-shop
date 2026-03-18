// frontend/src/app/admin/inventory/page.tsx
"use client";

import { useEffect, useState } from "react";

import InventoryTable from "@/components/admin/InventoryTable";
import Spinner from "@/components/ui/Spinner";
import { useProducts } from "@/hooks/useProducts";
import { getInventory } from "@/lib/api/inventory";
import { useInventoryUpdate } from "@/hooks/useInventory";
import { Inventory } from "@/types/inventory";

export default function AdminInventoryPage(): JSX.Element {
  const { data, isLoading } = useProducts(1, 50);
  const updateMutation = useInventoryUpdate();
  const [rows, setRows] = useState<Inventory[]>([]);

  useEffect(() => {
    const load = async (): Promise<void> => {
      if (!data) {
        return;
      }

      const list = await Promise.all(
        data.items.map(async (product) => {
          const inventory = await getInventory(product.id);
          return (
            inventory ?? {
              id: `missing-${product.id}`,
              product_id: product.id,
              quantity: 0,
              updated_at: new Date().toISOString(),
            }
          );
        }),
      );

      setRows(list);
    };

    void load();
  }, [data]);

  if (isLoading) {
    return <div className="flex justify-center p-10"><Spinner className="h-8 w-8" /></div>;
  }

  return (
    <InventoryTable
      rows={rows}
      onSave={async (productId, quantity) => {
        const updated = await updateMutation.mutateAsync({ productId, quantity });
        setRows((prev) => prev.map((row) => (row.product_id === productId ? updated : row)));
      }}
    />
  );
}
