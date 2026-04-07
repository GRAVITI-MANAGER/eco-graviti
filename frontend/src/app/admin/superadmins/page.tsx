// src/app/admin/superadmins/page.tsx
//
// Lists platform superadmins with create + deactivate flows. All requests
// go through `adminClient` (via `admin-auth` helpers) — never the tenant
// `apiClient`.
'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Plus, ShieldOff } from 'lucide-react';
import {
  adminDeactivateSuperadmin,
  adminListSuperadmins,
  adminReactivateSuperadmin,
  adminRegister,
} from '@/lib/api/admin-auth';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import type { AdminUser } from '@/types/admin';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PAGE_SIZE = 20;

interface CreateFormState {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

const EMPTY_FORM: CreateFormState = {
  email: '',
  password: '',
  first_name: '',
  last_name: '',
};

export default function SuperadminsPage() {
  const { admin: currentAdmin } = useAdminAuth();
  const [items, setItems] = useState<AdminUser[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_FORM);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Deactivate confirmation state
  const [pendingDeactivate, setPendingDeactivate] = useState<AdminUser | null>(
    null,
  );
  const [deactivateSubmitting, setDeactivateSubmitting] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const loadPage = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    setListError(null);
    try {
      const data = await adminListSuperadmins(targetPage);
      setItems(data.results);
      setCount(data.count);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la lista de superadministradores.';
      setListError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(page);
  }, [loadPage, page]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(count / PAGE_SIZE)),
    [count],
  );

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreateSubmitting(true);
    try {
      const created = await adminRegister({
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        first_name: createForm.first_name.trim() || undefined,
        last_name: createForm.last_name.trim() || undefined,
      });
      // Optimistic prepend so the user immediately sees the result.
      setItems((prev) => [created, ...prev]);
      setCount((prev) => prev + 1);
      setCreateForm(EMPTY_FORM);
      setCreateOpen(false);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo crear el superadministrador.';
      setCreateError(message);
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function handleConfirmDeactivate() {
    if (!pendingDeactivate) return;
    setDeactivateSubmitting(true);
    setRowError(null);
    try {
      const updated = await adminDeactivateSuperadmin(pendingDeactivate.id);
      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      setPendingDeactivate(null);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo desactivar el superadministrador.';
      setRowError(message);
    } finally {
      setDeactivateSubmitting(false);
    }
  }

  async function handleReactivate(target: AdminUser) {
    setRowError(null);
    try {
      const updated = await adminReactivateSuperadmin(target.id);
      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'No se pudo reactivar el superadministrador.';
      setRowError(message);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-2 text-slate-600"
            >
              <Link href="/admin">
                <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
                Volver al panel
              </Link>
            </Button>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Superadministradores
            </h1>
            <p className="text-sm text-slate-600">
              Gestiona quién puede acceder al panel de plataforma.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Nuevo superadmin
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cuentas activas y desactivadas</CardTitle>
            <CardDescription>
              {count === 0
                ? 'Aún no hay superadministradores registrados.'
                : `${count} superadministrador${count === 1 ? '' : 'es'} en total.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {listError && (
              <Alert variant="destructive" aria-live="polite">
                <AlertDescription>{listError}</AlertDescription>
              </Alert>
            )}
            {rowError && (
              <Alert variant="destructive" aria-live="polite">
                <AlertDescription>{rowError}</AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Cargando…
              </div>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Último acceso</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-8 text-center text-sm text-slate-500"
                        >
                          No hay superadministradores en esta página.
                        </TableCell>
                      </TableRow>
                    ) : (
                      items.map((item) => {
                        const isSelf = currentAdmin?.id === item.id;
                        const fullName =
                          [item.first_name, item.last_name]
                            .filter(Boolean)
                            .join(' ') || '—';
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.email}
                              {isSelf && (
                                <span className="ml-2 text-xs text-slate-500">
                                  (tú)
                                </span>
                              )}
                            </TableCell>
                            <TableCell>{fullName}</TableCell>
                            <TableCell>
                              {item.is_active ? (
                                <Badge variant="default">Activo</Badge>
                              ) : (
                                <Badge variant="secondary">Inactivo</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {item.last_login
                                ? new Date(item.last_login).toLocaleString()
                                : 'Nunca'}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.is_active ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={isSelf}
                                  onClick={() => setPendingDeactivate(item)}
                                  aria-label={`Desactivar ${item.email}`}
                                >
                                  <ShieldOff
                                    className="mr-1 h-4 w-4"
                                    aria-hidden="true"
                                  />
                                  Desactivar
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReactivate(item)}
                                  aria-label={`Reactivar ${item.email}`}
                                >
                                  Reactivar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm text-slate-600">
                <span>
                  Página {page} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || isLoading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || isLoading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo superadministrador</DialogTitle>
            <DialogDescription>
              La nueva cuenta podrá acceder al panel de plataforma de inmediato.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleCreate}
            className="space-y-4"
            aria-describedby={createError ? 'create-admin-error' : undefined}
          >
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                required
                autoComplete="off"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Contraseña</Label>
              <Input
                id="create-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
              />
              <p className="text-xs text-slate-500">
                Mínimo 8 caracteres. El backend rechaza contraseñas débiles.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="create-first-name">Nombre</Label>
                <Input
                  id="create-first-name"
                  value={createForm.first_name}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      first_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-last-name">Apellido</Label>
                <Input
                  id="create-last-name"
                  value={createForm.last_name}
                  onChange={(e) =>
                    setCreateForm((prev) => ({
                      ...prev,
                      last_name: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {createError && (
              <Alert
                variant="destructive"
                id="create-admin-error"
                aria-live="polite"
              >
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={createSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createSubmitting}>
                {createSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando…
                  </>
                ) : (
                  'Crear superadmin'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate confirmation */}
      <AlertDialog
        open={pendingDeactivate !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeactivate(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar superadministrador</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeactivate
                ? `${pendingDeactivate.email} perderá acceso al panel de plataforma. Puedes reactivar la cuenta más tarde.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivateSubmitting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDeactivate();
              }}
              disabled={deactivateSubmitting}
            >
              {deactivateSubmitting ? 'Desactivando…' : 'Desactivar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
