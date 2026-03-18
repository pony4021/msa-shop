// frontend/src/app/products/[id]/page.tsx
"use client";

import ProductDetail from "@/components/product/ProductDetail";
import Spinner from "@/components/ui/Spinner";
import { useProduct } from "@/hooks/useProducts";

interface ProductDetailPageProps {
  params: { id: string };
}

export default function ProductDetailPage({ params }: ProductDetailPageProps): JSX.Element {
  const { data, isLoading, isError } = useProduct(params.id);

  if (isLoading) {
    return <div className="flex justify-center p-10"><Spinner className="h-8 w-8" /></div>;
  }

  if (isError || !data) {
    return <p className="text-rose-600">상품 정보를 불러오지 못했습니다.</p>;
  }

  return <ProductDetail product={data} />;
}
