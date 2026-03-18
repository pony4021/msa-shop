// frontend-admin/src/app/admin/products/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import ProductForm from "@/components/product/ProductForm";
import TablePagination from "@/components/admin/TablePagination";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { useToastStore } from "@/components/ui/Toast";
import { useProductMutations, useProducts } from "@/hooks/useProducts";
import { formatCurrency } from "@/lib/utils";
import { Product } from "@/types/product";

export default function AdminProductsPage(): JSX.Element {
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const tableTopRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useProducts(page, pageSize);
  const { updateMutation, deleteMutation } = useProductMutations();
  const pushToast = useToastStore((state) => state.push);

  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [lastSuccess, setLastSuccess] = useState<string>("");

  useEffect(() => {
    tableTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [data?.total, page, pageSize]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const handleDelete = async (): Promise<void> => {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting.id);
      const message = `'${deleting.name}' 상품이 삭제되었습니다.`;
      pushToast(message, "success");
      setLastSuccess(message);
    } catch {
      pushToast("상품 삭제에 실패했습니다.", "error");
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleActive = async (product: Product): Promise<void> => {
    try {
      await updateMutation.mutateAsync({
        id: product.id,
        payload: { ...product, is_active: !product.is_active },
      });
      const message = `'${product.name}' 상품이 ${!product.is_active ? "활성화" : "비활성화"}되었습니다.`;
      pushToast(message, "success");
      setLastSuccess(message);
    } catch {
      pushToast("상태 변경에 실패했습니다.", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">상품 관리</h1>
            <p className="mt-0.5 text-sm text-slate-500">총 {data?.total ?? 0}개 상품</p>
            {lastSuccess ? <p className="mt-1 text-sm font-medium text-emerald-700">최근 작업: {lastSuccess}</p> : null}
          </div>
          <Link className="inline-flex h-9 items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700" href="/admin/products/new">
            + 상품 등록
          </Link>
        </div>
      </div>

      <div ref={tableTopRef} className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[920px] w-full table-fixed text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
            <tr>
              <th className="w-[40%] px-4 py-3 text-left font-medium">상품명</th>
              <th className="w-[15%] px-4 py-3 text-right font-medium">가격</th>
              <th className="w-[10%] px-4 py-3 text-right font-medium">재고</th>
              <th className="w-[15%] px-4 py-3 text-center font-medium">상태</th>
              <th className="w-[20%] px-4 py-3 text-center font-medium">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(data?.items ?? []).map((product) => (
              <tr key={product.id} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-3.5 align-middle font-medium text-slate-900">{product.name}</td>
                <td className="px-4 py-3.5 text-right align-middle">
                  <span className="whitespace-nowrap font-semibold tabular-nums text-slate-900">{formatCurrency(product.price)}</span>
                </td>
                <td className="px-4 py-3.5 text-right align-middle">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-700">
                    {product.stock}개
                  </span>
                </td>
                <td className="px-4 py-3.5 text-center align-middle">
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(product)}
                    disabled={updateMutation.isPending}
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                      product.is_active
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {product.is_active ? "활성" : "비활성"}
                  </button>
                </td>
                <td className="px-4 py-3.5 align-middle">
                  <div className="flex justify-center gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setEditing(product)}>
                      수정
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleting(product)}>
                      삭제
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={(nextPage) => setPage(nextPage)}
      />

      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title="상품 수정">
        {editing ? (
          <ProductForm
            initial={editing}
            loading={updateMutation.isPending}
            onSubmit={async (payload) => {
              try {
                await updateMutation.mutateAsync({
                  id: editing.id,
                  payload: { ...payload, is_active: editing.is_active },
                });
                const message = `'${editing.name}' 상품이 수정되었습니다.`;
                pushToast(message, "success");
                setLastSuccess(message);
                setEditing(null);
              } catch {
                pushToast("상품 수정에 실패했습니다.", "error");
              }
            }}
          />
        ) : null}
      </Modal>

      <ConfirmModal
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={() => void handleDelete()}
        title="상품 삭제"
        message={`'${deleting?.name}' 상품을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
