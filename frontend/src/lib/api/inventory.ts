// frontend/src/lib/api/inventory.ts
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
  } catch {
    throw new Error("재고 수정에 실패했습니다.");
  }
}
