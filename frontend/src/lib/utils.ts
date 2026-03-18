// frontend/src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

export function formatCurrency(value: number | string): string {
  const numeric = typeof value === "number" ? value : Number(value);
  const amount = Number.isFinite(numeric) ? numeric : 0;
  return amount.toLocaleString("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });
}
