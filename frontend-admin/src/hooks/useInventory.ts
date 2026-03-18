// frontend/src/hooks/useInventory.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getInventory, updateInventory } from "@/lib/api/inventory";

export function useInventory(productId: string) {
  return useQuery({
    queryKey: ["inventory", productId],
    queryFn: () => getInventory(productId),
    enabled: Boolean(productId),
  });
}

export function useInventoryUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      updateInventory(productId, quantity),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory"] });
      void queryClient.invalidateQueries({ queryKey: ["inventory", variables.productId] });
    },
  });
}
