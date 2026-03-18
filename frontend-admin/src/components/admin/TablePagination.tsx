// frontend-admin/src/components/admin/TablePagination.tsx
"use client";

interface TablePaginationProps {
  total: number;
  page: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

export default function TablePagination({
  total,
  page,
  pageSize = 10,
  onPageChange,
}: TablePaginationProps): JSX.Element | null {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  if (total === 0) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <p>총 0개 중 0-0 표시</p>
      </div>
    );
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);

  const windowSize = 5;
  const half = Math.floor(windowSize / 2);
  let pageStart = Math.max(1, currentPage - half);
  let pageEnd = Math.min(totalPages, pageStart + windowSize - 1);
  pageStart = Math.max(1, pageEnd - windowSize + 1);

  const pages: number[] = [];
  for (let i = pageStart; i <= pageEnd; i += 1) {
    pages.push(i);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-sm text-slate-600">
        총 {total}개 중 {start}-{end} 표시
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="h-8 rounded-md border border-slate-300 px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          {"< 이전"}
        </button>

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`h-8 min-w-8 rounded-md border px-2 text-sm ${
              p === currentPage
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          className="h-8 rounded-md border border-slate-300 px-3 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          {"다음 >"}
        </button>
      </div>
    </div>
  );
}
