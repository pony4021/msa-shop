"use client";

import { FormEvent, useState } from "react";

import { login, me } from "@/lib/api/auth";
import { useAuthStore } from "@/store/authStore";

export default function AdminLoginPage(): JSX.Element {
  const setAuth = useAuthStore((state) => state.setAuth);
  const logout = useAuthStore((state) => state.logout);

  const [email, setEmail] = useState("admin@admin.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = await login({ email, password });
      const user = await me(token.access_token);

      if (!user.is_admin) {
        logout();
        setError("관리자 계정으로만 로그인할 수 있습니다.");
        return;
      }

      setAuth(user, token.access_token, token.expires_in);
      const searchParams = new URLSearchParams(window.location.search);
      const redirect = searchParams.get("redirect");
      const target = redirect && redirect.startsWith("/admin") ? redirect : "/admin";
      window.location.replace(target);
    } catch (e) {
      setError(e instanceof Error ? e.message : "관리자 로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto mt-10 grid max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft md:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden bg-[linear-gradient(145deg,#0b1220,#1e293b)] p-10 text-white md:block">
        <p className="text-xs font-semibold tracking-[0.2em] text-slate-300">ADMIN PORTAL</p>
        <h1 className="mt-4 text-3xl font-black leading-tight">관리자 전용 로그인</h1>
        <p className="mt-3 text-sm text-slate-300">
          상품, 주문, 재고 관리는 관리자 권한 계정으로만 접근할 수 있습니다.
        </p>
      </div>

      <div className="p-6 sm:p-8 md:p-10">
        <h2 className="text-2xl font-black text-slate-900">관리자 로그인</h2>
        <p className="mt-2 text-sm text-slate-500">관리자 계정으로 로그인해주세요.</p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-700">이메일</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@admin.com"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-700">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="비밀번호를 입력해주세요"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              required
            />
          </label>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "로그인 중..." : "관리자 로그인"}
          </button>
        </form>
      </div>
    </section>
  );
}
