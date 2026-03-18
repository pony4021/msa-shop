import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage(): JSX.Element {
  return (
    <section className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft md:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden bg-[linear-gradient(140deg,#0f172a,#1e293b)] p-10 text-white md:block">
        <p className="text-xs font-semibold tracking-[0.2em] text-slate-300">SHOP MSA</p>
        <h1 className="mt-4 text-3xl font-black leading-tight">더 빠르고 안전한 쇼핑을 위한 로그인</h1>
        <p className="mt-3 text-sm text-slate-300">
          주문 내역 확인, 찜 목록 관리, 장바구니 결제는 로그인 후 이용하실 수 있습니다.
        </p>
      </div>

      <div className="p-6 sm:p-8 md:p-10">
        <h2 className="text-2xl font-black text-slate-900">로그인</h2>
        <p className="mt-2 text-sm text-slate-500">일반 사용자 계정으로 로그인해주세요.</p>
        <LoginForm />
      </div>
    </section>
  );
}
