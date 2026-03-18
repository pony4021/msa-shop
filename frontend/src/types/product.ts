// frontend/src/types/product.ts
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  size: number;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  stock: number;
}

export interface UpdateProductRequest extends CreateProductRequest {
  is_active: boolean;
}
