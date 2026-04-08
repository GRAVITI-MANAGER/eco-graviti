// src/app/admin/login/page.tsx
//
// Platform superadmin login. Email + password ONLY. NO tenant input,
// NO social buttons, NO register link.
'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AdminLoginPage() {
  const { login, isAuthenticated, isLoading } = useAdminAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If a session is already live, hop straight to the dashboard.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/admin');
    }
  }, [isAuthenticated, isLoading, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      let message = 'Credenciales inválidas.';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response?: { data?: { detail?: string } };
        };
        message = axiosErr.response?.data?.detail ?? message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white">
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            NERBIS Admin
          </CardTitle>
          <CardDescription>
            Acceso reservado a superadministradores de la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            noValidate
            aria-describedby={error ? 'admin-login-error' : undefined}
          >
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                name="email"
                autoComplete="username"
                required
                disabled={submitting}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nerbis.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Contraseña</Label>
              <Input
                id="admin-password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                disabled={submitting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <Alert
                variant="destructive"
                id="admin-login-error"
                aria-live="polite"
              >
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !email || !password}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ingresando…
                </>
              ) : (
                'Ingresar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
