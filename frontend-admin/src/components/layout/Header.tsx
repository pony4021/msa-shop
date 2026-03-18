// frontend-admin/src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Store, User } from "lucide-react";

import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";

export default function Header(): JSX.Element | null {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { logoutMutation } = useAuth();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-20 mt-4 space-y-2">
      <div className="rounded-xl bg-slate-900 px-4 py-2 text-center text-xs text-white">
        신규 회원 첫 구매 무료배송, 인기 상품 최대 20% 할인
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-soft backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/admin" className="inline-flex items-center gap-2 text-xl font-extrabold tracking-tight text-slate-900">
            <Store className="h-5 w-5 text-brand-600" />
            Shop MSA
          </Link>
          <label className="relative hidden min-w-[260px] flex-1 md:block md:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-full border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
              placeholder="상품명을 검색해보세요"
            />
          </label>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/admin" className="rounded-full px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-950">
              관리자 대시보드
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-700">
                  <User className="h-3.5 w-3.5" />
                  {user?.username}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={logoutMutation.isPending}
                  onClick={() => logoutMutation.mutate()}
                >
                  로그아웃
                </Button>
              </div>
            ) : (
              <Link href="/admin/login" className="rounded-full bg-slate-900 px-3 py-2 text-white">
                로그인
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
