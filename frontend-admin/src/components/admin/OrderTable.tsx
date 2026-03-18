// frontend-admin/src/components/admin/OrderTable.tsx
"use client";

import { formatCurrency } from "@/lib/utils";
import { Order, OrderStatus } from "@/types/order";

interface OrderTableProps {
  orders: Order[];
  productNameMap: Record<string, string>;
  userLabelMap: Record<string, string>;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; badgeClass: string }> = {
  pending: {
    label: "대기",
    badgeClass: "bg-amber-100 text-amber-700 border border-amber-200",
  },
  confirmed: {
    label: "확정",
    badgeClass: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  },
  cancelled: {
    label: "취소",
    badgeClass: "bg-rose-100 text-rose-700 border border-rose-200",
  },
};

export default function OrderTable({ orders, productNameMap, userLabelMap, onUpdateStatus }: OrderTableProps): JSX.Element {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[1120px] w-full table-fixed text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
          <tr>
            <th className="w-[17%] px-4 py-3 text-left font-medium">주문번호</th>
            <th className="w-[20%] px-4 py-3 text-left font-medium">주문상품</th>
            <th className="w-[8%] px-4 py-3 text-right font-medium">수량</th>
            <th className="w-[24%] px-4 py-3 text-left font-medium">주문자</th>
            <th className="w-[12%] px-4 py-3 text-right font-medium">결제금액</th>
            <th className="w-[11%] px-4 py-3 text-center font-medium">주문상태</th>
            <th className="w-[12%] px-4 py-3 text-left font-medium">주문일시</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.length === 0 ? (
            <tr>
              <td className="px-4 py-12 text-center text-slate-500" colSpan={7}>
                주문 내역이 없습니다.
              </td>
            </tr>
          ) : null}

          {orders.map((order) => {
            const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            return (
              <tr key={order.id} className="align-top transition-colors hover:bg-slate-50">
                <td className="px-4 py-3.5">
                  <p className="break-all font-mono text-xs text-slate-500">{order.id}</p>
                </td>

                <td className="px-4 py-3.5">
                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <p key={item.id} className="break-words text-slate-800">
                        {productNameMap[item.product_id] ?? item.product_id}
                      </p>
                    ))}
                  </div>
                </td>

                <td className="px-4 py-3.5 text-right">
                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <p key={item.id} className="tabular-nums text-slate-700">
                        {item.quantity}
                      </p>
                    ))}
                  </div>
                </td>

                <td className="px-4 py-3.5">
                  <p className="break-words text-slate-800">{userLabelMap[order.user_id] ?? order.user_id}</p>
                </td>

                <td className="px-4 py-3.5 text-right">
                  <span className="whitespace-nowrap font-semibold tabular-nums text-slate-900">
                    {formatCurrency(order.total_price)}
                  </span>
                </td>

                <td className="px-4 py-3.5 text-center">
                  <div className="mx-auto flex max-w-[140px] flex-col items-center gap-1.5">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${status.badgeClass}`}>
                      {status.label}
                    </span>
                    <select
                      className="h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700"
                      value={order.status}
                      onChange={(event) => onUpdateStatus(order.id, event.target.value as OrderStatus)}
                    >
                      <option value="pending">대기</option>
                      <option value="confirmed">확정</option>
                      <option value="cancelled">취소</option>
                    </select>
                  </div>
                </td>

                <td className="px-4 py-3.5 text-slate-700">
                  {new Date(order.created_at).toLocaleString("ko-KR")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
