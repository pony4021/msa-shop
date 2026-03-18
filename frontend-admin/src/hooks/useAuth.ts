"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { login, logout as apiLogout, me, register } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";
import { LoginRequest, RegisterRequest } from "@/types/auth";

export function useAuth() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const storeLogout = useAuthStore((state) => state.logout);

  const loginMutation = useMutation({
    mutationFn: async (request: LoginRequest) => {
      const token = await login(request);
      const user = await me(token.access_token);
      if (!user.is_admin) {
        throw new Error("관리자 계정으로만 로그인할 수 있습니다.");
      }
      return { token, user };
    },
    onSuccess: ({ token, user }) => {
      setAuth(user, token.access_token, token.expires_in);
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      const safeRedirect = redirect && redirect.startsWith("/admin") ? redirect : "/admin";
      router.push(safeRedirect);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (request: RegisterRequest) => register(request),
    onSuccess: () => router.push("/admin/login"),
  });

  const logoutMutation = useMutation({
    mutationFn: apiLogout,
    onSettled: () => {
      storeLogout();
      router.push("/admin/login");
    },
  });

  return { loginMutation, registerMutation, logoutMutation };
}
