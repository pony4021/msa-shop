// frontend/src/hooks/useProducts.ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createProduct, deleteProduct, getProduct, getProducts, updateProduct } from "@/lib/api/products";
import { CreateProductRequest, UpdateProductRequest } from "@/types/product";

export function useProducts(page = 1, size = 12) {
  return useQuery({
    queryKey: ["products", page, size],
    queryFn: () => getProducts(page, size),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => getProduct(id),
    enabled: Boolean(id),
  });
}

export function useProductMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: CreateProductRequest) => createProduct(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateProductRequest }) => updateProduct(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return { createMutation, updateMutation, deleteMutation };
}
