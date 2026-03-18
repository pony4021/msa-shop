// frontend-admin/src/components/admin/AdminProductNewPageClient.tsx
"use client";

import { useRouter } from "next/navigation";

import ProductForm from "@/components/product/ProductForm";
import { useProductMutations } from "@/hooks/useProducts";

export default function AdminProductNewPageClient(): JSX.Element {
  const router = useRouter();
  const { createMutation } = useProductMutations();

  return (
    <div className="max-w-xl rounded-xl border border-slate-200 bg-white p-5">
      <h1 className="mb-4 text-xl font-semibold">상품 등록</h1>
      <ProductForm
        loading={createMutation.isPending}
        onSubmit={async (payload) => {
          await createMutation.mutateAsync(payload);
          router.push("/admin/products");
        }}
      />
    </div>
  );
}

