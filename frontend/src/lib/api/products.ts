// src/lib/api/products.ts

import { apiClient } from './client';
import { Product, ProductCategory, ProductImage, ProductFormData, ProductFilters, PaginatedResponse } from '@/types';

/**
 * Obtener todas las categorías de productos
 */
export async function getProductCategories(): Promise<ProductCategory[]> {
  const { data } = await apiClient.get<PaginatedResponse<ProductCategory>>('/categories/');
  return data.results;
}

/**
 * Obtener todos los productos
 */
export async function getProducts(params?: {
  category?: number;
  is_featured?: boolean;
  search?: string;
  min_price?: number;
  max_price?: number;
  page_size?: number;
}): Promise<PaginatedResponse<Product>> {
  const { data } = await apiClient.get<PaginatedResponse<Product>>('/products/', { params });
  return data;
}

/**
 * Obtener producto por ID
 */
export async function getProduct(id: number): Promise<Product> {
  const { data } = await apiClient.get<Product>(`/products/${id}/`);
  return data;
}

/**
 * Obtener productos destacados
 */
export async function getFeaturedProducts(): Promise<Product[]> {
  const { data } = await apiClient.get<Product[]>('/products/featured/');
  return data;
}

// ============================================
// ADMIN: Products CRUD
// ============================================

/**
 * Obtener productos para admin (incluye inactivos y agotados)
 */
export async function getAdminProducts(params?: ProductFilters): Promise<PaginatedResponse<Product>> {
  const { data } = await apiClient.get<PaginatedResponse<Product>>('/products/', {
    params: { ...params, include_out_of_stock: 'true' },
  });
  return data;
}

/**
 * Crear un nuevo producto
 */
export async function createProduct(data: ProductFormData): Promise<Product> {
  const { data: product } = await apiClient.post<Product>('/products/', data);
  return product;
}

/**
 * Actualizar un producto existente
 */
export async function updateProduct(id: number, data: Partial<ProductFormData>): Promise<Product> {
  const { data: product } = await apiClient.patch<Product>(`/products/${id}/`, data);
  return product;
}

/**
 * Eliminar un producto
 */
export async function deleteProduct(id: number): Promise<void> {
  await apiClient.delete(`/products/${id}/`);
}

/**
 * Actualizar stock de un producto
 */
export async function updateStock(
  productId: number,
  action: 'increase' | 'decrease',
  quantity: number,
): Promise<{ message: string; inventory: Product['inventory'] }> {
  const { data } = await apiClient.patch(`/products/${productId}/update_stock/`, {
    action,
    quantity,
  });
  return data;
}

// ============================================
// ADMIN: Product Images
// ============================================

/**
 * Subir una imagen a un producto
 */
export async function uploadProductImage(
  productId: number,
  file: File,
  isPrimary: boolean = false,
  order: number = 0,
): Promise<ProductImage> {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('is_primary', isPrimary.toString());
  formData.append('order', order.toString());
  const { data } = await apiClient.post<ProductImage>(
    `/products/${productId}/images/`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

/**
 * Eliminar una imagen de un producto
 */
export async function deleteProductImage(productId: number, imageId: number): Promise<void> {
  await apiClient.delete(`/products/${productId}/images/${imageId}/`);
}

// ============================================
// ADMIN: Categories CRUD
// ============================================

/**
 * Crear una nueva categoría
 */
export async function createCategory(data: FormData): Promise<ProductCategory> {
  const { data: category } = await apiClient.post<ProductCategory>('/categories/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return category;
}

/**
 * Actualizar una categoría
 */
export async function updateCategory(id: number, data: FormData): Promise<ProductCategory> {
  const { data: category } = await apiClient.patch<ProductCategory>(`/categories/${id}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return category;
}

/**
 * Eliminar una categoría
 */
export async function deleteCategory(id: number): Promise<void> {
  await apiClient.delete(`/categories/${id}/`);
}