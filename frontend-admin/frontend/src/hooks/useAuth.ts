// frontend/src/hooks/useAuth.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { login, logout as apiLogout, me, register } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import { LoginRequest, RegisterRequest } from "@/types/auth";

export function useAuth() {
  const router = useRouter();
  const setToken = useAuthStore((state) => state.setToken);
  const setAuth = useAuthStore((state) => state.setAuth);
  const storeLogout = useAuthStore((state) => state.logout);

  const loginMutation = useMutation({
    mutationFn: (request: LoginRequest) => login(request),
    onSuccess: async (token) => {
      // Persist token immediately so protected routes do not bounce on first navigation.
      setToken(token.access_token);

      try {
        const user = await me(token.access_token);
        setAuth(user, token.access_token);
      } catch {
        // Keep token-based login state even if profile request is temporarily unavailable.
      }

      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      router.push(redirect ?? "/products");
    },
  });

  const registerMutation = useMutation({
    mutationFn: (request: RegisterRequest) => register(request),
    onSuccess: () => router.push("/login"),
  });

  const logoutMutation = useMutation({
    mutationFn: apiLogout,
    onSettled: () => {
      storeLogout();
      router.push("/login");
    },
  });

  return { loginMutation, registerMutation, logoutMutation };
}
