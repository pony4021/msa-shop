// frontend-admin/src/components/admin/AdminInventoryPageClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import InventoryTable from "@/components/admin/InventoryTable";
import TablePagination from "@/components/admin/TablePagination";
import Spinner from "@/components/ui/Spinner";
import { useInventoryUpdate } from "@/hooks/useInventory";
import { useProducts } from "@/hooks/useProducts";
import { getInventory } from "@/lib/api/inventory";
import { Inventory } from "@/types/inventory";

export default function AdminInventoryPageClient(): JSX.Element {
  const pageSize = 10;
  const { data, isLoading, isError } = useProducts(1, 100);
  const updateMutation = useInventoryUpdate();
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Inventory[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const tableTopRef = useRef<HTMLDivElement>(null);

  const productNameMap = Object.fromEntries((data?.items ?? []).map((product) => [product.id, product.name]));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [page, pageSize, rows]);

  useEffect(() => {
    const load = async (): Promise<void> => {
      if (!data) return;

      try {
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
        setLoadError(null);
      } catch {
        setLoadError("재고 데이터를 불러오지 못했습니다.");
      }
    };

    void load();
  }, [data]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
      return;
    }
    tableTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [rows.length, page, pageSize]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isError || loadError) {
    return <p className="text-rose-600">{loadError ?? "상품 정보를 불러오지 못했습니다."}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">재고 관리</h1>
            <p className="mt-0.5 text-sm text-slate-500">총 {rows.length}개 상품</p>
          </div>
        </div>
      </div>

      <div ref={tableTopRef}>
        <InventoryTable
          rows={pagedRows}
          productNameMap={productNameMap}
          onSave={async (productId, quantity) => {
            const updated = await updateMutation.mutateAsync({ productId, quantity });
            setRows((prev) => prev.map((row) => (row.product_id === productId ? updated : row)));
          }}
        />
      </div>

      <TablePagination
        total={rows.length}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage) => setPage(nextPage)}
      />
    </div>
  );
}
