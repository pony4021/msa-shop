// frontend/src/components/admin/OrderTable.tsx
"use client";

import { formatCurrency } from "@/lib/utils";
import { Order, OrderStatus } from "@/types/order";

interface OrderTableProps {
  orders: Order[];
  productNameMap: Record<string, string>;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
}

function formatItems(order: Order, productNameMap: Record<string, string>): string {
  return order.items
    .map((item) => `${productNameMap[item.product_id] ?? item.product_id} x${item.quantity}`)
    .join(", ");
}

export default function OrderTable({ orders, productNameMap, onUpdateStatus }: OrderTableProps): JSX.Element {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-100">
          <tr>
            <th className="p-3 text-left">Order ID</th>
            <th className="p-3 text-left">Items</th>
            <th className="p-3 text-left">User ID</th>
            <th className="p-3 text-left">Amount</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Created</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="p-3">{order.id}</td>
              <td className="p-3">{formatItems(order, productNameMap)}</td>
              <td className="p-3">{order.user_id}</td>
              <td className="p-3">{formatCurrency(order.total_price)}</td>
              <td className="p-3">
                <select
                  className="rounded-md border border-slate-300 px-2 py-1"
                  value={order.status}
                  onChange={(event) => onUpdateStatus(order.id, event.target.value as OrderStatus)}
                >
                  <option value="pending">pending</option>
                  <option value="confirmed">confirmed</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </td>
              <td className="p-3">{new Date(order.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
