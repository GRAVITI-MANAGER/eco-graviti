// src/lib/api/bookings.ts

import { apiClient } from './client';
import { Appointment, AvailabilitySlot, BusinessHours, StaffStats } from '@/types';

/**
 * Obtener horarios de negocio
 */
export async function getBusinessHours(): Promise<BusinessHours[]> {
  const { data } = await apiClient.get<BusinessHours[]>('/bookings/business-hours/');
  return data;
}

/**
 * Obtener disponibilidad para un servicio
 */
export async function getAvailability(params: {
  service_id: number;
  date: string; // YYYY-MM-DD
  staff_member_id?: number;
}): Promise<AvailabilitySlot[]> {
  const { data } = await apiClient.get<{
    date: string;
    service: string;
    total_slots: number;
    slots: AvailabilitySlot[];
  }>('/bookings/appointments/availability/', { params });
  
  return data.slots;
}

/**
 * Crear cita
 */
export async function createAppointment(appointmentData: {
  service: number;
  staff_member: number;
  start_datetime: string; // ISO 8601
  notes?: string;
}): Promise<Appointment> {
  const { data } = await apiClient.post<Appointment>('/bookings/appointments/', appointmentData);
  return data;
}

/**
 * Obtener mis citas
 */
export async function getMyAppointments(): Promise<Appointment[]> {
  const { data } = await apiClient.get<Appointment[] | { results: Appointment[] }>('/bookings/appointments/my-appointments/');
  // Manejar respuesta paginada o array directo
  return Array.isArray(data) ? data : data.results || [];
}

/**
 * Obtener próximas citas
 */
export async function getUpcomingAppointments(): Promise<Appointment[]> {
  const { data } = await apiClient.get<Appointment[] | { results: Appointment[] }>('/bookings/appointments/upcoming/');
  // Manejar respuesta paginada o array directo
  return Array.isArray(data) ? data : data.results || [];
}

/**
 * Cancelar cita
 */
export async function cancelAppointment(appointmentId: number, reason?: string): Promise<Appointment> {
  const { data } = await apiClient.post<{
    message: string;
    appointment: Appointment;
  }>(`/bookings/appointments/${appointmentId}/cancel/`, { reason });

  return data.appointment;
}

/**
 * Confirmar cita (solo staff/admin)
 */
export async function confirmAppointment(appointmentId: number): Promise<Appointment> {
  const { data } = await apiClient.post<{
    message: string;
    appointment: Appointment;
  }>(`/bookings/appointments/${appointmentId}/confirm/`);
  return data.appointment;
}

/**
 * Iniciar servicio - cliente llegó (solo staff/admin)
 */
export async function startAppointment(appointmentId: number): Promise<Appointment> {
  const { data } = await apiClient.post<{
    message: string;
    appointment: Appointment;
  }>(`/bookings/appointments/${appointmentId}/start/`);
  return data.appointment;
}

/**
 * Completar cita (solo staff/admin)
 */
export async function completeAppointment(appointmentId: number): Promise<Appointment> {
  const { data } = await apiClient.post<{
    message: string;
    appointment: Appointment;
  }>(`/bookings/appointments/${appointmentId}/complete/`);
  return data.appointment;
}

/**
 * Marcar como No Asistió (solo staff/admin)
 */
export async function noShowAppointment(appointmentId: number): Promise<Appointment> {
  const { data } = await apiClient.post<{
    message: string;
    appointment: Appointment;
  }>(`/bookings/appointments/${appointmentId}/no-show/`);
  return data.appointment;
}

/**
 * Obtener citas asignadas al staff actual
 */
export async function getStaffAppointments(params?: {
  status?: string;
  start_date?: string;
  end_date?: string;
}): Promise<Appointment[]> {
  const { data } = await apiClient.get<Appointment[] | { results: Appointment[] }>(
    '/bookings/appointments/staff-appointments/',
    { params }
  );
  return Array.isArray(data) ? data : data.results || [];
}

/**
 * Obtener métricas del staff actual
 */
export async function getStaffStats(): Promise<StaffStats> {
  const { data } = await apiClient.get<StaffStats>('/bookings/appointments/staff-stats/');
  return data;
}