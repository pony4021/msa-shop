// frontend/src/components/admin/DashboardStats.tsx
import { Product } from "@/types/product";
import { Order } from "@/types/order";

interface DashboardStatsProps {
  products: Product[];
  orders: Order[];
}

export default function DashboardStats({ products, orders }: DashboardStatsProps): JSX.Element {
  const today = new Date().toDateString();
  const todayOrders = orders.filter((order) => new Date(order.created_at).toDateString() === today).length;
  const lowStock = products.filter((product) => product.stock <= 5).length;
  const paymentSuccess = orders.filter((order) => order.status === "confirmed").length;

  const cards = [
    { label: "전체 상품 수", value: products.length },
    { label: "오늘 주문 수", value: todayOrders },
    { label: "재고 부족 상품 수", value: lowStock },
    { label: "결제 성공 건수", value: paymentSuccess },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div className="rounded-xl border border-slate-200 bg-white p-4" key={card.label}>
          <p className="text-sm text-slate-500">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
