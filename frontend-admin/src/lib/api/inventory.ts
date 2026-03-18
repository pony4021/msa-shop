// frontend-admin/src/lib/api/inventory.ts
import { AxiosError } from "axios";

import api from "@/lib/api/axios";
import { Inventory } from "@/types/inventory";

export async function getInventory(productId: string): Promise<Inventory | null> {
  try {
    const { data } = await api.get<Inventory>(`/api/inventory/${productId}`);
    return data;
  } catch {
    return null;
  }
}

export async function updateInventory(productId: string, quantity: number): Promise<Inventory> {
  try {
    const { data } = await api.put<Inventory>(`/api/inventory/${productId}`, { quantity });
    return data;
  } catch (e) {
    const err = e as AxiosError;
    if (err.response?.status === 404) {
      const { data } = await api.post<Inventory>("/api/inventory/", {
        product_id: productId,
        quantity,
      });
      return data;
    }
    throw new Error("Failed to update inventory.");
  }
}
