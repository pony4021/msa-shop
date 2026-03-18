// frontend/src/components/auth/RegisterForm.tsx
"use client";

import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { useToastStore } from "@/components/ui/Toast";

const registerSchema = z
  .object({
    email: z.string().email("올바른 이메일을 입력하세요"),
    username: z.string().min(2, "2자 이상 입력하세요"),
    password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterForm(): JSX.Element {
  const { registerMutation } = useAuth();
  const pushToast = useToastStore((state) => state.push);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", username: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (values: RegisterFormValues): Promise<void> => {
    try {
      await registerMutation.mutateAsync({
        email: values.email,
        username: values.username,
        password: values.password,
      });
      pushToast("회원가입이 완료되었습니다.", "success");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "회원가입 실패", "error");
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <Input label="이메일" type="email" error={errors.email?.message} {...register("email")} />
      <Input label="사용자명" error={errors.username?.message} {...register("username")} />
      <Input label="비밀번호" type="password" error={errors.password?.message} {...register("password")} />
      <Input label="비밀번호 확인" type="password" error={errors.confirmPassword?.message} {...register("confirmPassword")} />
      <Button className="w-full" type="submit" loading={registerMutation.isPending}>
        회원가입
      </Button>
      <p className="text-center text-sm text-slate-600">
        이미 계정이 있나요? <Link className="text-brand-600" href="/login">로그인</Link>
      </p>
    </form>
  );
}
