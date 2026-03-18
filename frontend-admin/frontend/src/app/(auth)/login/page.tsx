// frontend/src/app/(auth)/login/page.tsx
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage(): JSX.Element {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
      <h1 className="mb-4 text-2xl font-semibold">로그인</h1>
      <LoginForm />
    </div>
  );
}
