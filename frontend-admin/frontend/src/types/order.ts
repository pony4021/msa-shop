// frontend/src/types/order.ts
export type OrderStatus = "pending" | "confirmed" | "cancelled";

export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_price: number;
  items: OrderItem[];
  created_at: string;
  updated_at?: string;
}

export interface CreateOrderRequest {
  items: { product_id: string; quantity: number }[];
}
