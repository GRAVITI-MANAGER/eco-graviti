// src/lib/api/cart.ts

import { apiClient } from './client';
import { Cart } from '@/types';

/**
 * Obtener mi carrito
 */
export async function getCart(): Promise<Cart> {
  const { data } = await apiClient.get<Cart>('/cart/');
  return data;
}

/**
 * Agregar producto al carrito
 */
export async function addProductToCart(productId: number, quantity: number): Promise<Cart> {
  const { data } = await apiClient.post<{ message: string; cart: Cart }>('/cart/add-product/', {
    product_id: productId,
    quantity,
  });
  return data.cart;
}

/**
 * Agregar servicio/cita al carrito
 */
export async function addServiceToCart(serviceId: number, appointmentId: number): Promise<Cart> {
  const { data } = await apiClient.post<{ message: string; cart: Cart }>('/cart/add-service/', {
    service_id: serviceId,
    appointment_id: appointmentId,
  });
  return data.cart;
}

/**
 * Actualizar cantidad de item
 */
export async function updateCartItem(itemId: number, quantity: number): Promise<Cart> {
  const { data } = await apiClient.patch<{ message: string; cart: Cart }>(
    `/cart/items/${itemId}/`,
    { quantity }
  );
  return data.cart;
}

/**
 * Eliminar item del carrito
 */
export async function removeCartItem(itemId: number): Promise<Cart> {
  const { data } = await apiClient.delete<{ message: string; cart: Cart }>(
    `/cart/items/${itemId}/`
  );
  return data.cart;
}

/**
 * Vaciar carrito
 */
export async function clearCart(): Promise<void> {
  await apiClient.post('/cart/clear/');
}