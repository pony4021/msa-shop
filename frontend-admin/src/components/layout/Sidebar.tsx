// frontend-admin/src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, ExternalLink, LayoutDashboard, LogOut, Package, ShoppingBag, Store, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

const items = [
  { href: "/admin", label: "대시보드", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", label: "상품 관리", icon: Package, exact: false },
  { href: "/admin/orders", label: "주문 관리", icon: ShoppingBag, exact: false },
  { href: "/admin/inventory", label: "재고 관리", icon: Boxes, exact: false },
  { href: "/admin/users", label: "사용자 관리", icon: Users, exact: false },
];

export default function Sidebar(): JSX.Element {
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const handleLogout = (): void => {
    logout();
    window.location.replace("/admin/login");
  };

  return (
    <aside className="sticky top-4 h-fit rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4">
        <Link href="/admin" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
            <Store className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Shop MSA 관리자</p>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Admin</p>
          </div>
        </Link>
      </div>

      <nav className="p-2">
        <ul className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-100 p-2">
        <a
          href="/"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          메인 페이지
        </a>
        {user ? <p className="mb-1 truncate px-3 text-xs text-slate-400">{user.email}</p> : null}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
