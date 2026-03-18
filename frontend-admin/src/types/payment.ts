// frontend/src/types/payment.ts
export type PaymentStatus = "pending" | "success" | "failed";

export interface Payment {
  id: string;
  order_id: string;
  user_id?: string;
  amount: number;
  status: PaymentStatus;
  created_at: string;
  updated_at?: string;
}
