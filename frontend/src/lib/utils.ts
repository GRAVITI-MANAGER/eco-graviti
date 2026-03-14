import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function getTenantCurrency(): string {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_CURRENCY || 'EUR';
  try {
    const tenantStr = localStorage.getItem('tenant');
    if (tenantStr) {
      const tenant = JSON.parse(tenantStr);
      if (tenant.currency) return tenant.currency;
    }
  } catch {
    // ignore parse errors
  }
  return process.env.NEXT_PUBLIC_CURRENCY || 'EUR';
}

export function formatPrice(price: string | number, currency?: string): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  const currencyCode = currency || getTenantCurrency();
  const locale = process.env.NEXT_PUBLIC_LOCALE || 'es-ES';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
  }).format(numPrice);
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }
  const locale = process.env.NEXT_PUBLIC_LOCALE || 'es-ES';

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }
  const locale = process.env.NEXT_PUBLIC_LOCALE || 'es-ES';

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
  }).format(date);
}
