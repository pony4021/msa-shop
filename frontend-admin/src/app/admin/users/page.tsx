// frontend-admin/src/app/admin/users/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import TablePagination from "@/components/admin/TablePagination";
import Spinner from "@/components/ui/Spinner";
import { AdminUser, getAdminUsers } from "@/lib/api/users";

export default function AdminUsersPage(): JSX.Element {
  const pageSize = 10;
  const tableTopRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAdminUsers(1, 100);
        setUsers(data);
      } catch (e) {
        setError((e as Error).message || "사용자 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const pagedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return users.slice(start, start + pageSize);
  }, [page, pageSize, users]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
      return;
    }
    tableTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page, pageSize, users.length]);

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return <p className="text-rose-600">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">사용자 관리</h1>
        <p className="mt-0.5 text-sm text-slate-500">일반 사용자 총 {users.length}명</p>
      </div>

      <div ref={tableTopRef} className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[980px] w-full table-fixed text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
            <tr>
              <th className="w-[26%] px-4 py-3 text-left font-medium">이메일</th>
              <th className="w-[18%] px-4 py-3 text-left font-medium">사용자명</th>
              <th className="w-[12%] px-4 py-3 text-center font-medium">상태</th>
              <th className="w-[22%] px-4 py-3 text-left font-medium">가입일시</th>
              <th className="w-[22%] px-4 py-3 text-left font-medium">최근 접속 시간</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagedUsers.length === 0 ? (
              <tr>
                <td className="px-4 py-12 text-center text-slate-500" colSpan={5}>
                  표시할 일반 사용자가 없습니다.
                </td>
              </tr>
            ) : null}

            {pagedUsers.map((user) => (
              <tr key={user.id} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-3.5 align-middle break-words text-slate-800">{user.email}</td>
                <td className="px-4 py-3.5 align-middle text-slate-800">{user.username}</td>
                <td className="px-4 py-3.5 align-middle text-center">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                      user.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {user.is_active ? "활성" : "비활성"}
                  </span>
                </td>
                <td className="px-4 py-3.5 align-middle text-slate-700">{new Date(user.created_at).toLocaleString("ko-KR")}</td>
                <td className="px-4 py-3.5 align-middle text-slate-700">
                  {user.last_login_at ? new Date(user.last_login_at).toLocaleString("ko-KR") : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination
        total={users.length}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage) => setPage(nextPage)}
      />
    </div>
  );
}
