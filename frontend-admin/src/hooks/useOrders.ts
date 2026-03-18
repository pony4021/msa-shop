// frontend/src/hooks/useOrders.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createOrder, getAdminOrders, getMyOrders, getOrder, updateOrderStatus } from "@/lib/api/orders";
import { createPayment } from "@/lib/api/payments";
import { CreateOrderRequest, OrderStatus } from "@/types/order";

export function useOrders(admin = false) {
  return useQuery({
    queryKey: ["orders", admin ? "admin" : "me"],
    queryFn: admin ? getAdminOrders : getMyOrders,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrder(id),
    enabled: Boolean(id),
  });
}

export function useOrderMutations() {
  const queryClient = useQueryClient();

  const createOrderMutation = useMutation({
    mutationFn: (payload: CreateOrderRequest) => createOrder(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: ({ orderId, amount }: { orderId: string; amount: number }) =>
      createPayment({ order_id: orderId, amount }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => updateOrderStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  return { createOrderMutation, createPaymentMutation, updateStatusMutation };
}
