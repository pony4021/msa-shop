// frontend/src/components/order/OrderItem.tsx
import { formatCurrency } from "@/lib/utils";
import { OrderItem as OrderItemType } from "@/types/order";

interface OrderItemProps {
  item: OrderItemType;
  productName?: string;
}

export default function OrderItem({ item, productName }: OrderItemProps): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
      <div>
        <p className="text-sm text-slate-600">Product: {productName ?? item.product_id}</p>
        <p className="text-sm">Qty: {item.quantity}</p>
      </div>
      <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
    </div>
  );
}
