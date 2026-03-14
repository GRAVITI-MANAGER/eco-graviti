// src/lib/api/services.ts

import { apiClient } from './client';
import { Service, ServiceCategory, StaffMember, StaffProfile, PaginatedResponse } from '@/types';

/**
 * Obtener categorías de servicios
 */
export async function getServiceCategories(): Promise<ServiceCategory[]> {
  const { data } = await apiClient.get<PaginatedResponse<ServiceCategory>>('/services/categories/');
  return data.results;
}

/**
 * Obtener servicios
 */
export async function getServices(params?: {
  category?: number;
  is_featured?: boolean;
  search?: string;
  min_duration?: number;
  max_duration?: number;
  page_size?: number;
}): Promise<PaginatedResponse<Service>> {
  const sanitizedParams = params
    ? Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
      )
    : undefined;
  const { data } = await apiClient.get<PaginatedResponse<Service>>('/services/list/', {
    params: sanitizedParams,
  });
  return data;
}

/**
 * Obtener servicio por ID
 */
export async function getService(id: number): Promise<Service> {
  const { data } = await apiClient.get<Service>(`/services/list/${id}/`);
  return data;
}

/**
 * Obtener servicios destacados
 */
export async function getFeaturedServices(): Promise<Service[]> {
  const { data } = await apiClient.get<Service[]>('/services/list/featured/');
  return data;
}

/**
 * Obtener staff disponible para un servicio
 */
export async function getServiceStaff(serviceId: number): Promise<StaffMember[]> {
  const { data } = await apiClient.get<StaffMember[]>(`/services/list/${serviceId}/staff/`);
  return data;
}

/**
 * Obtener todo el staff
 */
export async function getStaff(): Promise<StaffMember[]> {
  const { data } = await apiClient.get<PaginatedResponse<StaffMember>>('/services/staff/');
  return data.results;
}

/**
 * Obtener perfil de staff del usuario autenticado con servicios asignados
 */
export async function getStaffMyProfile(): Promise<StaffProfile> {
  const { data } = await apiClient.get<StaffProfile>('/services/staff/my-profile/');
  return data;
}
