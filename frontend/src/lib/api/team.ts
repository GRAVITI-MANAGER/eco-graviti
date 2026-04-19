// src/lib/api/team.ts

import { apiClient } from './client';
import {
  TeamInvitation,
  TeamMember,
  CreateInvitationData,
  AcceptInvitationData,
  InvitationDetail,
  AuthResponse,
} from '@/types';

/**
 * Listar miembros del equipo (admin + staff)
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
  const { data } = await apiClient.get<TeamMember[]>('/team/members/');
  return data;
}

/**
 * Listar invitaciones de equipo
 */
export async function getTeamInvitations(): Promise<TeamInvitation[]> {
  const { data } = await apiClient.get<TeamInvitation[]>('/team/invitations/');
  return data;
}

/**
 * Crear invitación de equipo
 */
export async function createTeamInvitation(invitationData: CreateInvitationData): Promise<TeamInvitation> {
  const { data } = await apiClient.post<TeamInvitation>('/team/invitations/', invitationData);
  return data;
}

/**
 * Cancelar invitación
 */
export async function cancelTeamInvitation(id: number): Promise<void> {
  await apiClient.delete(`/team/invitations/${id}/`);
}

/**
 * Reenviar invitación
 */
export async function resendTeamInvitation(id: number): Promise<{ message: string }> {
  const { data } = await apiClient.post<{ message: string }>(`/team/invitations/${id}/resend/`);
  return data;
}

/**
 * Obtener detalle de invitación (público, sin auth)
 */
export async function getInvitationDetail(token: string): Promise<InvitationDetail> {
  const { data } = await apiClient.get<InvitationDetail>(`/public/invitation/${token}/`);
  return data;
}

/**
 * Aceptar invitación (público, sin auth)
 */
export async function acceptInvitation(token: string, acceptData: AcceptInvitationData): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(`/public/accept-invitation/${token}/`, acceptData);

  // Guardar sesión como en el login normal
  if (typeof window !== 'undefined') {
    localStorage.setItem('access_token', response.data.tokens.access);
    localStorage.setItem('refresh_token', response.data.tokens.refresh);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    if (response.data.tenant) {
      localStorage.setItem('tenant', JSON.stringify(response.data.tenant));
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `tenant-slug=${response.data.tenant.slug}; path=/; SameSite=Lax${secure}`;
    }
  }

  return response.data;
}
