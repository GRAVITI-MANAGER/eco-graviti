// src/lib/api/banners.ts

import { apiClient } from './client';
import { Banner, PaginatedResponse } from '@/types';

/**
 * Obtener banners activos
 * @param position - Filtrar por posición: 'top' o 'bottom' (opcional)
 */
export async function getActiveBanners(position?: 'top' | 'bottom'): Promise<Banner[]> {
  const params = position ? { position } : {};
  const response = await apiClient.get<PaginatedResponse<Banner>>('/banners/', { params });
  return response.data.results;
}

/**
 * Obtener banners activos para la posición superior
 */
export async function getTopBanners(): Promise<Banner[]> {
  return getActiveBanners('top');
}

/**
 * Obtener banners activos para la posición inferior
 */
export async function getBottomBanners(): Promise<Banner[]> {
  return getActiveBanners('bottom');
}