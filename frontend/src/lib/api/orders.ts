// src/lib/api/orders.ts

import { apiClient } from './client';
import { Order, PaginatedResponse } from '@/types';

/**
 * Obtener mis órdenes
 */
export async function getOrders(): Promise<Order[]> {
  const { data } = await apiClient.get<PaginatedResponse<Order>>('/orders/');
  return data.results;
}

/**
 * Obtener orden por ID
 */
export async function getOrder(id: number): Promise<Order> {
  const { data } = await apiClient.get<Order>(`/orders/${id}/`);
  return data;
}

/**
 * Crear orden desde carrito
 */
export async function createOrder(orderData: {
  billing_name: string;
  billing_email: string;
  billing_phone?: string;
  billing_address?: string;
  billing_city?: string;
  billing_postal_code?: string;
  billing_country?: string;
  use_billing_for_shipping?: boolean;
  shipping_name?: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_postal_code?: string;
  customer_notes?: string;
}): Promise<Order> {
  const { data } = await apiClient.post<{ message: string; order: Order }>(
    '/checkout/create-order/',
    orderData
  );
  return data.order;
}

/**
 * Crear Payment Intent
 */
export async function createPaymentIntent(orderId: number): Promise<{
  client_secret: string;
  payment_intent_id: string;
  amount: number;
  currency: string;
  payment_id: number;
}> {
  const { data } = await apiClient.post('/checkout/create-payment-intent/', {
    order_id: orderId,
  });
  return data;
}

/**
 * Confirmar pago (respaldo cuando webhook no está disponible)
 */
export async function confirmPayment(orderId: number, paymentIntentId: string): Promise<{
  message: string;
  order_status: string;
}> {
  const { data } = await apiClient.post('/checkout/confirm-payment/', {
    order_id: orderId,
    payment_intent_id: paymentIntentId,
  });
  return data;
}