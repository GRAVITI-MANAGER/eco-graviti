// src/app/admin/page.tsx
//
// Placeholder superadmin landing. Real dashboard widgets land in a follow-up.
'use client';

import Link from 'next/link';
import { LogOut, Users } from 'lucide-react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function AdminDashboardPage() {
  const { admin, logout } = useAdminAuth();

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">
              Panel de plataforma
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              NERBIS Admin
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Bienvenido, {admin?.email ?? 'superadmin'}.
            </p>
          </div>
          <Button variant="outline" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
            Cerrar sesión
          </Button>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" aria-hidden="true" />
                Superadministradores
              </CardTitle>
              <CardDescription>
                Gestiona quién tiene acceso al panel de plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="default">
                <Link href="/admin/superadmins">Gestionar superadmins</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
