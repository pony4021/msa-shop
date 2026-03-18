"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useToastStore } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";

const loginSchema = z.object({
  email: z.string().email("올바른 이메일 형식을 입력해주세요."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm(): JSX.Element {
  const { loginMutation } = useAuth();
  const pushToast = useToastStore((state) => state.push);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("required") === "1") {
      pushToast("로그인이 필요한 서비스입니다.", "info");
    }
  }, [pushToast]);

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    try {
      await loginMutation.mutateAsync(values);
      pushToast("로그인되었습니다.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "로그인에 실패했습니다.", "error");
    }
  };

  return (
    <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <label className="block space-y-1">
        <span className="text-sm font-semibold text-slate-700">이메일</span>
        <input
          type="email"
          placeholder="you@example.com"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          {...register("email")}
        />
        {errors.email ? <p className="text-xs text-rose-600">{errors.email.message}</p> : null}
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-semibold text-slate-700">비밀번호</span>
        <input
          type="password"
          placeholder="비밀번호를 입력해주세요"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          {...register("password")}
        />
        {errors.password ? <p className="text-xs text-rose-600">{errors.password.message}</p> : null}
      </label>

      <button
        type="submit"
        disabled={loginMutation.isPending}
        className="inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loginMutation.isPending ? "로그인 중..." : "로그인"}
      </button>

      <p className="text-center text-sm text-slate-600">
        계정이 없으신가요?{" "}
        <Link className="font-semibold text-brand-600 hover:underline" href="/register">
          회원가입
        </Link>
      </p>
    </form>
  );
}
