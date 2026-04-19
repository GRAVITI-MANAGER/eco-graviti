// src/types/admin.ts
//
// Platform superadmin types. Deliberately DO NOT include `tenant`,
// `tenant_slug`, or `role` fields — the admin surface is fully isolated
// from the tenant surface.

export interface AdminUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_superuser: boolean;
  is_staff: boolean;
  is_active: boolean;
  date_joined: string;
  last_login: string | null;
}

export interface AdminLoginResponse {
  access: string;
  refresh: string;
  user: AdminUser;
}

export interface AdminPaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
