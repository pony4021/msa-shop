// frontend/src/components/order/OrderDetail.tsx
"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

import Badge from "@/components/ui/Badge";
import OrderItem from "@/components/order/OrderItem";
import { formatCurrency } from "@/lib/utils";
import { Order } from "@/types/order";

interface OrderDetailProps {
  order: Order;
  productNameMap?: Record<string, string>;
}

const STATUS_LABEL: Record<Order["status"], string> = {
  pending: "결제 대기중",
  confirmed: "결제 완료",
  cancelled: "주문 취소됨",
};

const STATUS_DESC: Record<Order["status"], string> = {
  pending: "결제가 진행 중입니다. 잠시만 기다려주세요.",
  confirmed: "결제가 완료되었습니다. 빠른 배송으로 보내드리겠습니다.",
  cancelled: "주문이 취소되었습니다. 결제 금액은 환불 처리됩니다.",
};

function statusVariant(status: Order["status"]): "default" | "success" | "danger" {
  if (status === "confirmed") return "success";
  if (status === "cancelled") return "danger";
  return "default";
}

export default function OrderDetail({ order, productNameMap = {} }: OrderDetailProps): JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = (): void => {
    void navigator.clipboard.writeText(order.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">주문 상세</h1>
        <Badge variant={statusVariant(order.status)}>{STATUS_LABEL[order.status]}</Badge>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
        <span className="shrink-0 font-medium text-slate-500">주문번호</span>
        <span className="flex-1 font-mono text-xs">{order.id}</span>
        <button
          onClick={handleCopy}
          className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          type="button"
          title="복사"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{STATUS_DESC[order.status]}</p>

      <div className="space-y-2">
        {order.items.map((item) => (
          <OrderItem key={item.id} item={item} productName={productNameMap[item.product_id]} />
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="font-medium text-slate-700">합계</span>
        <span className="text-lg font-bold text-slate-900">{formatCurrency(order.total_price)}</span>
      </div>

      <p className="text-right text-xs text-slate-400">
        주문일시: {new Date(order.created_at).toLocaleString("ko-KR")}
      </p>
    </section>
  );
}
