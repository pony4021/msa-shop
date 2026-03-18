// frontend/src/store/authStore.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { User } from "@/types/auth";

function writeAccessTokenCookie(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  document.cookie = `access_token=${encodeURIComponent(token)}; path=/; max-age=3600; SameSite=Lax`;
}

function clearAccessTokenCookie(): void {
  if (typeof window === "undefined") {
    return;
  }
  document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setToken: (token) => {
        writeAccessTokenCookie(token);
        set((prev) => ({ ...prev, token, isAuthenticated: true }));
      },
      setAuth: (user, token) => {
        writeAccessTokenCookie(token);
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        clearAccessTokenCookie();
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: "auth-store",
      version: 2,
      migrate: (persistedState: unknown) => {
        const state = persistedState as { user?: User | null; token?: string | null; isAuthenticated?: boolean } | undefined;
        if (!state) {
          return { user: null, token: null, isAuthenticated: false };
        }
        if (state.isAuthenticated && !state.token) {
          return { user: null, token: null, isAuthenticated: false };
        }
        return {
          user: state.user ?? null,
          token: state.token ?? null,
          isAuthenticated: Boolean(state.isAuthenticated),
        };
      },
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
