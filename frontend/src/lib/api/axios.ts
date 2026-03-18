// frontend/src/lib/api/axios.ts
import axios, { AxiosError } from "axios";

const baseURL = typeof window === "undefined" ? process.env.NEXT_PUBLIC_API_URL ?? "" : "";

const api = axios.create({
  baseURL,
  timeout: 8000,
});

function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function getTokenFromStorage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("auth-store");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { token?: string | null } };
    return parsed.state?.token ?? null;
  } catch {
    return null;
  }
}

api.interceptors.request.use((config) => {
  if (config.headers?.Authorization) {
    return config;
  }
  const token = getTokenFromCookie() ?? getTokenFromStorage();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      document.cookie = "access_token=; path=/; max-age=0; SameSite=Strict";
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?redirect=${redirect}&required=1`;
    }
    return Promise.reject(error);
  },
);

export default api;
