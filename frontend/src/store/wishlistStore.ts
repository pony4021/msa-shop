// frontend/src/store/wishlistStore.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { Product } from "@/types/product";

interface WishlistState {
  items: Record<string, Product>;
  toggleItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  isWished: (productId: string) => boolean;
  list: () => Product[];
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: {},
      toggleItem: (product) => {
        set((state) => {
          if (state.items[product.id]) {
            const next = { ...state.items };
            delete next[product.id];
            return { items: next };
          }
          return { items: { ...state.items, [product.id]: product } };
        });
      },
      removeItem: (productId) => {
        set((state) => {
          if (!state.items[productId]) {
            return state;
          }
          const next = { ...state.items };
          delete next[productId];
          return { items: next };
        });
      },
      isWished: (productId) => Boolean(get().items[productId]),
      list: () => Object.values(get().items),
    }),
    {
      name: "wishlist-store",
      version: 1,
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

