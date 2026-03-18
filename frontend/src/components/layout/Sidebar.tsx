// frontend/src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/products", label: "상품관리" },
  { href: "/admin/orders", label: "주문관리" },
  { href: "/admin/inventory", label: "재고관리" },
];

export default function Sidebar(): JSX.Element {
  const pathname = usePathname();

  return (
    <aside className="rounded-xl border border-slate-200 bg-white p-3">
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "block rounded-md px-3 py-2 text-sm",
                pathname === item.href || pathname.startsWith(`${item.href}/`) ? "bg-brand-100 text-brand-700" : "text-slate-700 hover:bg-slate-100",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
