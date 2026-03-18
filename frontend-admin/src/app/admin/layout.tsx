// frontend-admin/src/app/admin/layout.tsx
"use client";

import { useSelectedLayoutSegment } from "next/navigation";

import Sidebar from "@/components/layout/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }): JSX.Element {
  const segment = useSelectedLayoutSegment();
  const isLoginPage = segment === "login";

  if (isLoginPage) {
    return <section>{children}</section>;
  }

  return (
    <div className="grid gap-5 md:grid-cols-[220px_1fr]">
      <Sidebar />
      <section className="min-w-0">{children}</section>
    </div>
  );
}
