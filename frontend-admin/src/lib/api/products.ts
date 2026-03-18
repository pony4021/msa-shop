// frontend/src/lib/api/products.ts
import { AxiosError } from "axios";

import api from "@/lib/api/axios";
import { CreateProductRequest, Product, ProductListResponse, UpdateProductRequest } from "@/types/product";

interface RawProductListResponse {
  items: Product[];
  page: number;
  size: number;
  total: number;
}

export async function getProducts(page = 1, size = 12): Promise<ProductListResponse> {
  try {
    const { data } = await api.get<RawProductListResponse>(`/api/products/?page=${page}&size=${size}`);
    return {
      items: data.items,
      total: data.total,
      page: data.page,
      size: data.size,
    };
  } catch {
    throw new Error("상품 목록을 불러오지 못했습니다.");
  }
}

export async function getProduct(id: string): Promise<Product> {
  try {
    const { data } = await api.get<Product>(`/api/products/${id}`);
    return data;
  } catch (e) {
    const err = e as AxiosError;
    if (err.response?.status === 404) throw new Error("상품을 찾을 수 없습니다.");
    throw new Error("상품 정보를 불러오지 못했습니다.");
  }
}

export async function createProduct(request: CreateProductRequest): Promise<Product> {
  try {
    const { data } = await api.post<Product>("/api/products/", request);
    return data;
  } catch (e) {
    const err = e as AxiosError;
    if (err.response?.status === 403) throw new Error("관리자 권한이 필요합니다.");
    throw new Error("상품 등록에 실패했습니다.");
  }
}

export async function updateProduct(id: string, request: UpdateProductRequest): Promise<Product> {
  try {
    const { data } = await api.put<Product>(`/api/products/${id}`, request);
    return data;
  } catch (e) {
    const err = e as AxiosError;
    if (err.response?.status === 403) throw new Error("관리자 권한이 필요합니다.");
    if (err.response?.status === 404) throw new Error("상품을 찾을 수 없습니다.");
    throw new Error("상품 수정에 실패했습니다.");
  }
}

export async function deleteProduct(id: string): Promise<void> {
  try {
    await api.delete(`/api/products/${id}`);
  } catch (e) {
    const err = e as AxiosError;
    if (err.response?.status === 403) throw new Error("관리자 권한이 필요합니다.");
    if (err.response?.status === 404) throw new Error("상품을 찾을 수 없습니다.");
    throw new Error("상품 삭제에 실패했습니다.");
  }
}
