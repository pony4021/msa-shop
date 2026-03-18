// frontend/src/app/admin/products/page.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

import ProductForm from "@/components/product/ProductForm";
import Button from "@/components/ui/Button";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { useToastStore } from "@/components/ui/Toast";
import { useProductMutations, useProducts } from "@/hooks/useProducts";
import { formatCurrency } from "@/lib/utils";
import { Product } from "@/types/product";

export default function AdminProductsPage(): JSX.Element {
  const { data, isLoading } = useProducts(1, 50);
  const { updateMutation, deleteMutation } = useProductMutations();
  const pushToast = useToastStore((state) => state.push);

  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

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
      pushToast(`'${deleting.name}' 상품이 삭제되었습니다.`, "success");
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
      pushToast(
        `'${product.name}' 상품이 ${!product.is_active ? "활성화" : "비활성화"}되었습니다.`,
        "success",
      );
    } catch {
      pushToast("상태 변경에 실패했습니다.", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">상품 관리</h1>
          <p className="mt-0.5 text-sm text-slate-500">총 {data?.total ?? 0}개 상품</p>
        </div>
        <Link className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700" href="/admin/products/new">
          + 상품 등록
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="p-3 text-left font-medium text-slate-600">이름</th>
              <th className="p-3 text-left font-medium text-slate-600">가격</th>
              <th className="p-3 text-left font-medium text-slate-600">재고</th>
              <th className="p-3 text-left font-medium text-slate-600">상태</th>
              <th className="p-3 text-left font-medium text-slate-600">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(data?.items ?? []).map((product) => (
              <tr key={product.id} className="hover:bg-slate-50">
                <td className="p-3 font-medium text-slate-900">{product.name}</td>
                <td className="p-3 text-slate-700">{formatCurrency(product.price)}</td>
                <td className="p-3 text-slate-700">{product.stock}</td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => void handleToggleActive(product)}
                    disabled={updateMutation.isPending}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                      product.is_active
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {product.is_active ? "활성" : "비활성"}
                  </button>
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
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

      {/* 수정 모달 */}
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
                pushToast(`'${editing.name}' 상품이 수정되었습니다.`, "success");
                setEditing(null);
              } catch {
                pushToast("상품 수정에 실패했습니다.", "error");
              }
            }}
          />
        ) : null}
      </Modal>

      {/* 삭제 확인 모달 */}
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
