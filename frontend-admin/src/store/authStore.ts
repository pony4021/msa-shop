// frontend-admin/src/store/authStore.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { User } from "@/types/auth";

const COOKIE_NAME = "admin_access_token";

function writeAccessTokenCookie(token: string, maxAgeSeconds = 3600): void {
  if (typeof window === "undefined") {
    return;
  }
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

function clearAccessTokenCookie(): void {
  if (typeof window === "undefined") {
    return;
  }
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  // 기존 access_token 쿠키도 정리 (마이그레이션)
  document.cookie = "access_token=; path=/; max-age=0; SameSite=Lax";
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setToken: (token: string, maxAgeSeconds?: number) => void;
  setAuth: (user: User, token: string, maxAgeSeconds?: number) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setToken: (token, maxAgeSeconds) => {
        writeAccessTokenCookie(token, maxAgeSeconds);
        set((prev) => ({ ...prev, token, isAuthenticated: true }));
      },
      setAuth: (user, token, maxAgeSeconds) => {
        writeAccessTokenCookie(token, maxAgeSeconds);
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        clearAccessTokenCookie();
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: "admin-auth-store",
      version: 3,
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
