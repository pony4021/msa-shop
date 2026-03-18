// frontend/src/components/order/OrderList.tsx
import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import Badge from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { Order } from "@/types/order";

interface OrderListProps {
  orders: Order[];
}

const STATUS_LABEL: Record<Order["status"], string> = {
  pending: "대기중",
  confirmed: "결제완료",
  cancelled: "취소됨",
};

function statusVariant(status: Order["status"]): "default" | "success" | "danger" {
  if (status === "confirmed") return "success";
  if (status === "cancelled") return "danger";
  return "default";
}

export default function OrderList({ orders }: OrderListProps): JSX.Element {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white py-16 text-slate-500">
        <ShoppingBag className="h-10 w-10 text-slate-300" />
        <p className="font-medium">주문 내역이 없습니다</p>
        <Link href="/products" className="text-sm text-brand-600 hover:underline">
          쇼핑 시작하기
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/orders/${order.id}`}
          className="block rounded-xl border border-slate-200 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">
                주문번호 <span className="font-mono text-xs text-slate-500">{order.id.slice(0, 8)}…</span>
              </p>
              <p className="mt-0.5 text-sm text-slate-500">{new Date(order.created_at).toLocaleString("ko-KR")}</p>
              <p className="mt-1 text-xs text-slate-400">상품 {order.items.length}종</p>
            </div>
            <div className="text-right">
              <Badge variant={statusVariant(order.status)}>{STATUS_LABEL[order.status]}</Badge>
              <p className="mt-1 font-semibold text-slate-900">{formatCurrency(order.total_price)}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
