// frontend/src/components/admin/InventoryTable.tsx
"use client";

import { useState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Inventory } from "@/types/inventory";

interface InventoryTableProps {
  rows: Inventory[];
  onSave: (productId: string, quantity: number) => Promise<void>;
}

export default function InventoryTable({ rows, onSave }: InventoryTableProps): JSX.Element {
  const [edit, setEdit] = useState<Record<string, number>>({});

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-3 text-left">상품ID</th>
            <th className="p-3 text-left">현재 재고</th>
            <th className="p-3 text-left">마지막 업데이트</th>
            <th className="p-3 text-left">수정</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className={row.quantity <= 5 ? "bg-amber-50" : ""} key={row.product_id}>
              <td className="p-3">{row.product_id}</td>
              <td className="p-3">{row.quantity}</td>
              <td className="p-3">{new Date(row.updated_at).toLocaleString()}</td>
              <td className="p-3">
                <div className="flex items-center gap-2">
                  <Input
                    className="w-24"
                    type="number"
                    value={edit[row.product_id] ?? row.quantity}
                    onChange={(event) => setEdit((prev) => ({ ...prev, [row.product_id]: Number(event.target.value) }))}
                  />
                  <Button size="sm" onClick={() => onSave(row.product_id, edit[row.product_id] ?? row.quantity)}>
                    저장
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
