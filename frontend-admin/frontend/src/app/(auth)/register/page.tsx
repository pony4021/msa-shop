// frontend/src/app/(auth)/register/page.tsx
import RegisterForm from "@/components/auth/RegisterForm";

export default function RegisterPage(): JSX.Element {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-soft">
      <h1 className="mb-4 text-2xl font-semibold">회원가입</h1>
      <RegisterForm />
    </div>
  );
}
