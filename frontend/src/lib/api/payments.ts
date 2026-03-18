// frontend/src/lib/api/payments.ts
import { AxiosError } from "axios";

import api from "@/lib/api/axios";
import { Payment } from "@/types/payment";

interface CreatePaymentRequest {
  order_id: string;
  amount: number;
}

export async function createPayment(request: CreatePaymentRequest): Promise<Payment> {
  try {
    const { data } = await api.post<Payment>("/api/payments/", request);
    return data;
  } catch (e) {
    const err = e as AxiosError;
    if (err.response?.status === 409) throw new Error("이미 결제가 진행된 주문입니다.");
    throw new Error("결제 처리에 실패했습니다.");
  }
}

export async function getPaymentByOrder(orderId: string): Promise<Payment> {
  try {
    const { data } = await api.get<Payment>(`/api/payments/order/${orderId}`);
    return data;
  } catch (e) {
    const err = e as AxiosError;
    if (err.response?.status === 404) throw new Error("결제 정보를 찾을 수 없습니다.");
    throw new Error("결제 조회에 실패했습니다.");
  }
}
