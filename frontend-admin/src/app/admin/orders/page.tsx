// frontend-admin/src/app/admin/orders/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import OrderTable from "@/components/admin/OrderTable";
import TablePagination from "@/components/admin/TablePagination";
import Spinner from "@/components/ui/Spinner";
import { useOrderMutations, useOrders } from "@/hooks/useOrders";
import { useProducts } from "@/hooks/useProducts";
import { getUserById } from "@/lib/api/users";
import { OrderStatus } from "@/types/order";

export default function AdminOrdersPage(): JSX.Element {
  const pageSize = 10;
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [page, setPage] = useState(1);
  const tableTopRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError } = useOrders(true);
  const { data: productsData } = useProducts(1, 100);
  const { updateStatusMutation } = useOrderMutations();
  const [userLabelMap, setUserLabelMap] = useState<Record<string, string>>({});

  const productNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const product of productsData?.items ?? []) {
      map[product.id] = product.name;
    }
    return map;
  }, [productsData]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data;
    return data.filter((order) => order.status === filter);
  }, [data, filter]);

  const pagedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    const loadUsers = async (): Promise<void> => {
      if (!data || data.length === 0) {
        setUserLabelMap({});
        return;
      }

      const uniqueUserIds = [...new Set(data.map((order) => order.user_id))];
      const loaded = await Promise.all(
        uniqueUserIds.map(async (userId) => {
          const user = await getUserById(userId);
          if (!user) return [userId, userId] as const;
          return [userId, `${user.username} (${user.email})`] as const;
        }),
      );

      setUserLabelMap(Object.fromEntries(loaded));
    };

    void loadUsers();
  }, [data]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
      return;
    }
    tableTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [filtered.length, page, pageSize]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-rose-600">주문 목록을 불러오지 못했습니다.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">주문 관리</h1>
            <p className="mt-0.5 text-sm text-slate-500">총 {filtered.length}건</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">상태 필터</span>
            <select
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm"
              value={filter}
              onChange={(event) => setFilter(event.target.value as "all" | OrderStatus)}
            >
              <option value="all">전체</option>
              <option value="pending">대기</option>
              <option value="confirmed">확정</option>
              <option value="cancelled">취소</option>
            </select>
          </div>
        </div>
      </div>

      <div ref={tableTopRef}>
        <OrderTable
          orders={pagedOrders}
          productNameMap={productNameMap}
          userLabelMap={userLabelMap}
          onUpdateStatus={(id, status) => {
            updateStatusMutation.mutate({ id, status });
          }}
        />
      </div>

      <TablePagination
        total={filtered.length}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage) => setPage(nextPage)}
      />
    </div>
  );
}
