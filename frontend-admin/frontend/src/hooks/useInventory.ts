// frontend/src/hooks/useInventory.ts
"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { getInventory, updateInventory } from "@/lib/api/inventory";

export function useInventory(productId: string) {
  return useQuery({
    queryKey: ["inventory", productId],
    queryFn: () => getInventory(productId),
    enabled: Boolean(productId),
  });
}

export function useInventoryUpdate() {
  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      updateInventory(productId, quantity),
  });
}
