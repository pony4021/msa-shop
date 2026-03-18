// frontend/src/store/cartStore.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { Product } from "@/types/product";

export interface CartItem extends Product {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalPrice: () => number;
  totalCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity) => {
        const found = get().items.find((item) => item.id === product.id);
        if (found) {
          const newQty = found.quantity + quantity;
          if (newQty > product.stock) return; // 재고 초과 방지
          set({
            items: get().items.map((item) =>
              item.id === product.id ? { ...item, quantity: newQty } : item,
            ),
          });
          return;
        }
        const safeQty = Math.min(quantity, product.stock);
        if (safeQty <= 0) return;
        set({ items: [...get().items, { ...product, quantity: safeQty }] });
      },
      removeItem: (productId) => set({ items: get().items.filter((item) => item.id !== productId) }),
      updateQuantity: (productId, quantity) => {
        const item = get().items.find((i) => i.id === productId);
        if (!item) return;
        const safeQty = Math.min(Math.max(1, quantity), item.stock);
        set({
          items: get().items.map((i) => (i.id === productId ? { ...i, quantity: safeQty } : i)),
        });
      },
      clearCart: () => set({ items: [] }),
      totalPrice: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      totalCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: "cart-store" },
  ),
);
