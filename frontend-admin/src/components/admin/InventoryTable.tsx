// frontend-admin/src/components/admin/InventoryTable.tsx
"use client";

import { useState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Inventory } from "@/types/inventory";

interface InventoryTableProps {
  rows: Inventory[];
  productNameMap: Record<string, string>;
  onSave: (productId: string, quantity: number) => Promise<void>;
}

function StockBadge({ quantity }: { quantity: number }): JSX.Element {
  if (quantity === 0) {
    return <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">품절</span>;
  }
  if (quantity <= 5) {
    return <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">{quantity}개</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{quantity}개</span>;
}

export default function InventoryTable({ rows, productNameMap, onSave }: InventoryTableProps): JSX.Element {
  const [edit, setEdit] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const handleSave = async (productId: string): Promise<void> => {
    setSaving((prev) => ({ ...prev, [productId]: true }));
    try {
      const nextQuantity = edit[productId] ?? rows.find((row) => row.product_id === productId)?.quantity ?? 0;
      await onSave(productId, nextQuantity);
      setEdit((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    } finally {
      setSaving((prev) => ({ ...prev, [productId]: false }));
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[900px] w-full table-fixed text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
          <tr>
            <th className="w-[40%] px-4 py-3 text-left font-medium">상품명</th>
            <th className="w-[14%] px-4 py-3 text-right font-medium">현재 재고</th>
            <th className="w-[22%] px-4 py-3 text-left font-medium">마지막 수정일</th>
            <th className="w-[24%] px-4 py-3 text-center font-medium">재고 수정</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-12 text-center text-slate-500" colSpan={4}>
                재고 데이터가 없습니다.
              </td>
            </tr>
          ) : null}

          {rows.map((row) => {
            const editingQuantity = edit[row.product_id] ?? row.quantity;
            const isDirty = editingQuantity !== row.quantity;
            const isSaving = Boolean(saving[row.product_id]);

            return (
              <tr key={row.product_id} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-3.5 align-middle">
                  <p className="break-words font-medium text-slate-900">{productNameMap[row.product_id] ?? "알 수 없는 상품"}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-400">{row.product_id}</p>
                </td>

                <td className="px-4 py-3.5 text-right align-middle">
                  <div className="flex justify-end">
                    <StockBadge quantity={row.quantity} />
                  </div>
                </td>

                <td className="px-4 py-3.5 align-middle text-slate-700">
                  {new Date(row.updated_at).toLocaleString("ko-KR")}
                </td>

                <td className="px-4 py-3.5 align-middle">
                  <div className="flex items-center justify-center gap-2">
                    <Input
                      className="w-24 text-right tabular-nums"
                      type="number"
                      min={0}
                      value={editingQuantity}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setEdit((prev) => ({ ...prev, [row.product_id]: Number.isNaN(value) ? 0 : Math.max(0, value) }));
                      }}
                    />
                    <Button
                      size="sm"
                      variant="primary"
                      className="min-w-[64px] whitespace-nowrap"
                      disabled={!isDirty || isSaving}
                      onClick={() => void handleSave(row.product_id)}
                    >
                      {isSaving ? "저장중" : "저장"}
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
