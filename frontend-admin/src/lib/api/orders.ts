// frontend/src/lib/api/orders.ts
import { AxiosError } from "axios";

import api from "@/lib/api/axios";
import { CreateOrderRequest, Order, OrderStatus } from "@/types/order";

export async function createOrder(request: CreateOrderRequest): Promise<Order> {
  try {
    const { data } = await api.post<Order>("/api/orders/", request);
    return data;
  } catch (e) {
    const err = e as AxiosError<{ detail: string }>;
    if (err.response?.status === 400) {
      throw new Error(err.response.data?.detail ?? "잘못된 주문 요청입니다.");
    }
    throw new Error("주문 생성에 실패했습니다.");
  }
}

export async function getMyOrders(): Promise<Order[]> {
  try {
    const { data } = await api.get<Order[]>("/api/orders/");
    return data;
  } catch {
    throw new Error("주문 목록을 불러오지 못했습니다.");
  }
}

export async function getAdminOrders(): Promise<Order[]> {
  try {
    const { data } = await api.get<Order[]>("/api/orders/admin/all");
    return data;
  } catch {
    throw new Error("Failed to load admin orders.");
  }
}

export async function getOrder(id: string): Promise<Order> {
  try {
    const { data } = await api.get<Order>(`/api/orders/${id}`);
    return data;
  } catch (e) {
    const err = e as AxiosError;
    if (err.response?.status === 404) throw new Error("주문을 찾을 수 없습니다.");
    throw new Error("주문 상세를 불러오지 못했습니다.");
  }
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  try {
    const { data } = await api.patch<Order>(`/api/orders/${id}/status`, { status });
    return data;
  } catch {
    throw new Error("주문 상태 변경에 실패했습니다.");
  }
}
