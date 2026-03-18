// frontend/src/components/auth/LoginForm.tsx
"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { useToastStore } from "@/components/ui/Toast";

const loginSchema = z.object({
  email: z.string().email("올바른 이메일을 입력하세요"),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"),
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

  const onSubmit = async (values: LoginFormValues): Promise<void> => {
    try {
      await loginMutation.mutateAsync(values);
      pushToast("로그인되었습니다.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "로그인 실패", "error");
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <Input label="이메일" type="email" error={errors.email?.message} {...register("email")} />
      <Input label="비밀번호" type="password" error={errors.password?.message} {...register("password")} />
      <Button className="w-full" type="submit" loading={loginMutation.isPending}>
        로그인
      </Button>
      <p className="text-center text-sm text-slate-600">
        계정이 없나요? <Link className="text-brand-600" href="/register">회원가입</Link>
      </p>
    </form>
  );
}
