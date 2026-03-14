// src/lib/api/coupons.ts

import { apiClient } from './client';
import { CouponValidationResponse, CouponApplyResponse, AppliedCoupon } from '@/types';

export interface CouponPreviewResponse {
  valid: boolean;
  preview: boolean;
  coupon: {
    code: string;
    discount_type: 'percentage' | 'fixed_amount' | 'free_shipping';
    discount_value: number;
    discount_display: string;
  };
  discount_amount: number;
  message: string;
  warnings?: string[];
}

/**
 * Validar un cupón sin aplicarlo
 */
export async function validateCoupon(code: string): Promise<CouponValidationResponse> {
  const { data } = await apiClient.post<CouponValidationResponse>('/coupons/validate/', {
    code,
  });
  return data;
}

/**
 * Aplicar cupón al carrito
 */
export async function applyCoupon(code: string): Promise<CouponApplyResponse> {
  const { data } = await apiClient.post<CouponApplyResponse>('/coupons/apply/', {
    code,
  });
  return data;
}

/**
 * Eliminar cupón del carrito
 */
export async function removeCoupon(): Promise<{
  success: boolean;
  message: string;
  cart_subtotal: number;
  cart_total: number;
}> {
  const { data } = await apiClient.post('/coupons/remove/');
  return data;
}

/**
 * Obtener cupón actualmente aplicado al carrito
 */
export async function getCartCoupon(): Promise<{
  coupon: AppliedCoupon | null;
  removed?: boolean;
  reason?: string;
}> {
  const { data } = await apiClient.get('/coupons/cart/');
  return data;
}

/**
 * Preview de cupón para usuarios anónimos
 * No requiere autenticación
 */
export async function previewCoupon(code: string, subtotal: number): Promise<CouponPreviewResponse> {
  const { data } = await apiClient.post<CouponPreviewResponse>('/coupons/preview/', {
    code,
    subtotal,
  });
  return data;
}
