// frontend/src/components/product/ProductForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { CreateProductRequest, Product } from "@/types/product";

const productSchema = z.object({
  name: z.string().min(1, "상품명을 입력하세요"),
  description: z.string().min(1, "설명을 입력하세요"),
  price: z.coerce.number().positive("가격은 0보다 커야 합니다"),
  stock: z.coerce.number().int().min(0, "재고는 0 이상이어야 합니다"),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  initial?: Product;
  loading?: boolean;
  onSubmit: (payload: CreateProductRequest) => Promise<void>;
}

export default function ProductForm({ initial, loading = false, onSubmit }: ProductFormProps): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      price: initial?.price ?? 0,
      stock: initial?.stock ?? 0,
    },
  });

  return (
    <form className="space-y-3" onSubmit={handleSubmit(async (values) => onSubmit(values))}>
      <Input label="상품명" error={errors.name?.message} {...register("name")} />
      <Input label="설명" error={errors.description?.message} {...register("description")} />
      <Input label="가격" type="number" error={errors.price?.message} {...register("price")} />
      <Input label="재고" type="number" error={errors.stock?.message} {...register("stock")} />
      <Button type="submit" loading={loading}>
        저장
      </Button>
    </form>
  );
}
