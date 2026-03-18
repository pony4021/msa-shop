// frontend/src/app/admin/layout.tsx
import Sidebar from "@/components/layout/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="grid gap-4 md:grid-cols-[220px_1fr]">
      <Sidebar />
      <section>{children}</section>
    </div>
  );
}
