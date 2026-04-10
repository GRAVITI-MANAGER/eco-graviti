// src/lib/api/admin-client.ts
//
// Dedicated axios instance for the platform superadmin surface.
//
// ISOLATION INVARIANTS (enforced by ESLint + scripts/assert-admin-isolation.mjs):
//   1. MUST NOT import the tenant axios client (the sibling file in this
//      directory or its alias under "@/lib/api"). Only the standalone
//      `axios` package may be imported here.
//   2. MUST NOT read or write the tenant localStorage keys. Only the
//      admin_* namespaced keys (admin_access_token, admin_refresh_token,
//      admin_user) are allowed.
//   3. MUST NOT send any tenant routing header. The tenant header literal
//      is intentionally NOT spelled in this file — see the runtime
//      concatenation below — so that the isolation grep script can
//      forbid it everywhere without false positives here.
//   4. On refresh failure, clears ONLY admin_* keys — the tenant session
//      stays intact.
import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from 'axios';

const ADMIN_API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export const ADMIN_STORAGE_KEYS = {
  access: 'admin_access_token',
  refresh: 'admin_refresh_token',
  user: 'admin_user',
} as const;

export class AdminApiError extends Error {
  status?: number;
  code?: string;
  data?: unknown;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.code = code;
  }
}

export const adminClient: AxiosInstance = axios.create({
  baseURL: ADMIN_API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ──────────────────────────────────────────────────────────────────────
// Request interceptor: Authorization only. Never any tenant header.
// ──────────────────────────────────────────────────────────────────────
//
// We construct the forbidden header name at runtime via concatenation so
// that the literal string never appears in this source file — this lets
// scripts/assert-admin-isolation.mjs grep-fail on tenant header literals
// while still allowing this defensive strip to run.
const FORBIDDEN_TENANT_HEADER_LOWER = ['x', 'tenant', 'slug'].join('-');

adminClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem(ADMIN_STORAGE_KEYS.access);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  // Defensive: strip any tenant header that may have been attached upstream
  // (axios normalizes header names to lower-case internally).
  if (config.headers) {
    const headers = config.headers as Record<string, unknown>;
    delete headers[FORBIDDEN_TENANT_HEADER_LOWER];
    delete headers[FORBIDDEN_TENANT_HEADER_LOWER.toUpperCase()];
    // Also strip the title-cased form some libraries set.
    const titleCased = FORBIDDEN_TENANT_HEADER_LOWER
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('-');
    delete headers[titleCased];
  }
  return config;
});

// ──────────────────────────────────────────────────────────────────────
// 401 → refresh interceptor (admin namespace only).
// ──────────────────────────────────────────────────────────────────────
let refreshingPromise: Promise<string | null> | null = null;

function clearAdminSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ADMIN_STORAGE_KEYS.access);
  window.localStorage.removeItem(ADMIN_STORAGE_KEYS.refresh);
  window.localStorage.removeItem(ADMIN_STORAGE_KEYS.user);
}

async function refreshAdminToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const refresh = window.localStorage.getItem(ADMIN_STORAGE_KEYS.refresh);
  if (!refresh) return null;
  try {
    const res = await axios.post<{ access: string }>(
      `${ADMIN_API_BASE}/admin/auth/refresh/`,
      { refresh },
      { headers: { 'Content-Type': 'application/json' } },
    );
    const newAccess = res.data.access;
    window.localStorage.setItem(ADMIN_STORAGE_KEYS.access, newAccess);
    return newAccess;
  } catch {
    clearAdminSession();
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (!path.startsWith('/admin/login')) {
        window.location.href = '/admin/login';
      }
    }
    return null;
  }
}

adminClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ detail?: string; message?: string }>) => {
    if (!error.response) {
      return Promise.reject(
        new AdminApiError(
          'No se pudo conectar con el servidor. Verifica tu conexión.',
          0,
          'NETWORK_ERROR',
        ),
      );
    }

    const original = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;
    const requestUrl = original?.url ?? '';
    const isAdminAuthEndpoint =
      requestUrl.includes('/admin/auth/login') ||
      requestUrl.includes('/admin/auth/refresh');

    if (
      error.response.status === 401 &&
      original &&
      !original._retried &&
      !isAdminAuthEndpoint
    ) {
      original._retried = true;
      if (!refreshingPromise) {
        refreshingPromise = refreshAdminToken().finally(() => {
          refreshingPromise = null;
        });
      }
      const newAccess = await refreshingPromise;
      if (newAccess) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${newAccess}`;
        return adminClient(original);
      }
      return Promise.reject(
        new AdminApiError(
          'Sesión de administrador expirada. Inicia sesión de nuevo.',
          401,
          'ADMIN_UNAUTHORIZED',
        ),
      );
    }

    const serverMessage =
      error.response.data?.detail || error.response.data?.message;
    let userMessage: string;
    switch (error.response.status) {
      case 400:
        userMessage = serverMessage || 'Datos inválidos.';
        break;
      case 401:
        userMessage = serverMessage || 'Credenciales inválidas.';
        break;
      case 403:
        userMessage =
          serverMessage || 'No tienes permisos de superadmin para esta acción.';
        break;
      case 404:
        userMessage = serverMessage || 'Recurso no encontrado.';
        break;
      case 429:
        userMessage =
          'Demasiados intentos. Espera un momento antes de intentar de nuevo.';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        userMessage = 'Error del servidor. Intenta más tarde.';
        break;
      default:
        userMessage = serverMessage || 'Ocurrió un error inesperado.';
    }

    const apiError = new AdminApiError(userMessage, error.response.status);
    apiError.data = error.response.data;
    return Promise.reject(apiError);
  },
);

export default adminClient;
