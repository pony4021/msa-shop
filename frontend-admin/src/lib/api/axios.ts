// frontend-admin/src/lib/api/axios.ts
import axios, { AxiosError } from "axios";

const baseURL = typeof window === "undefined" ? process.env.NEXT_PUBLIC_API_URL ?? "" : "";

const api = axios.create({
  baseURL,
  timeout: 8000,
});

function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)admin_access_token=([^;]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

api.interceptors.request.use((config) => {
  if (config.headers?.Authorization) {
    return config;
  }
  const token = getTokenFromCookie();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      document.cookie = "admin_access_token=; path=/; max-age=0; SameSite=Lax";
      const redirect = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/admin/login?redirect=${redirect}`;
    }
    return Promise.reject(error);
  },
);

export default api;
