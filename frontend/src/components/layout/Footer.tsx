// frontend/src/components/layout/Footer.tsx
export default function Footer(): JSX.Element {
  return (
    <footer className="mt-8 rounded-2xl border border-slate-200 bg-white px-5 py-6 text-sm text-slate-600">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <p className="font-semibold text-slate-900">Shop MSA</p>
          <p className="mt-2 text-xs">고객센터 1588-0000 (평일 09:00 - 18:00)</p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">고객지원</p>
          <p className="mt-2 text-xs">배송조회 · 취소/반품 · 1:1 문의</p>
        </div>
        <div>
          <p className="font-semibold text-slate-900">회사정보</p>
          <p className="mt-2 text-xs">MSA Commerce Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
