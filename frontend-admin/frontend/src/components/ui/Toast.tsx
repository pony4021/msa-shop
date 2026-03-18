// frontend/src/components/ui/Toast.tsx
"use client";

import { create } from "zustand";
import { useEffect } from "react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, type: ToastType) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, type) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    window.setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    }, 3000);
  },
  remove: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

function ToastCard({ toast }: { toast: ToastItem }): JSX.Element {
  const remove = useToastStore((state) => state.remove);
  const style = toast.type === "success" ? "bg-emerald-600" : toast.type === "error" ? "bg-rose-600" : "bg-slate-700";

  useEffect(() => {
    return () => remove(toast.id);
  }, [remove, toast.id]);

  return (
    <div className={`rounded-lg px-3 py-2 text-sm text-white shadow-soft ${style}`}>
      <button className="w-full text-left" onClick={() => remove(toast.id)} type="button">
        {toast.message}
      </button>
    </div>
  );
}

export function ToastViewport(): JSX.Element {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
