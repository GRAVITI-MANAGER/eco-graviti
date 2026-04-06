// src/app/dashboard/settings/login/page.tsx
// Gestión de métodos de inicio de sesión — actualmente solo passkeys.
// Futuro: 2FA, historial de sesiones, dispositivos confiables.

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Fingerprint, KeyRound, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  deletePasskey,
  isWebAuthnSupported,
  listPasskeys,
  registerPasskey,
  type PasskeyRecord,
} from '@/lib/api/passkey';

const FOCUS_CLASS =
  'focus-visible:border-[#0D9488] focus-visible:ring-[#0D9488]/20';

export default function LoginSettingsPage() {
  const [supported, setSupported] = useState(true);
  const [passkeys, setPasskeys] = useState<PasskeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [registering, setRegistering] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listPasskeys();
      setPasskeys(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al cargar passkeys';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSupported(isWebAuthnSupported());
    void load();
  }, [load]);

  const handleRegister = async () => {
    const name = newName.trim() || 'Mi passkey';
    try {
      setRegistering(true);
      await registerPasskey(name);
      toast.success('Passkey registrado correctamente');
      setNewName('');
      await load();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo registrar el passkey';
      toast.error(message);
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    try {
      await deletePasskey(id);
      toast.success(`"${name}" eliminado`);
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al eliminar';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[1.25rem] font-semibold text-[#1C3B57]">
          Inicio de sesión
        </h1>
        <p className="text-[0.85rem] text-gray-500 mt-1">
          Administra cómo accedes a tu cuenta NERBIS.
        </p>
      </header>

      {/* Passkeys */}
      <section className="bg-white border border-gray-100 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Fingerprint className="w-4 h-4 text-[#0D9488]" aria-hidden="true" />
          <h2 className="text-[0.95rem] font-semibold text-[#1C3B57]">Passkeys</h2>
        </div>
        <p className="text-[0.8rem] text-gray-500 mb-5">
          Usa tu huella, Face ID o una llave de seguridad para iniciar sesión sin contraseña.
        </p>

        {!supported && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-[0.8rem] text-amber-800 mb-4">
            Tu navegador no soporta passkeys. Usa Chrome, Safari, Edge o Firefox actualizados.
          </div>
        )}

        {/* Formulario para agregar */}
        {supported && (
          <div className="flex flex-col sm:flex-row gap-2 mb-5">
            <Input
              placeholder="Nombre del dispositivo (ej: iPhone de Felipe)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={registering}
              className={`h-10 ${FOCUS_CLASS}`}
              maxLength={100}
            />
            <Button
              type="button"
              onClick={handleRegister}
              disabled={registering}
              className="bg-[#0D9488] hover:bg-[#0B7A70] text-white"
            >
              {registering ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
              )}
              {registering ? 'Registrando...' : 'Agregar passkey'}
            </Button>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex items-center gap-2 text-[0.8rem] text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Cargando...
          </div>
        ) : passkeys.length === 0 ? (
          <div className="text-center py-8 text-[0.85rem] text-gray-400">
            <KeyRound className="w-8 h-8 mx-auto mb-2 text-gray-300" aria-hidden="true" />
            Aún no tienes passkeys registrados.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {passkeys.map((p) => (
              <li key={p.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[0.875rem] font-medium text-[#1C3B57] truncate">
                    {p.name}
                  </p>
                  <p className="text-[0.72rem] text-gray-400 mt-0.5">
                    Creado {new Date(p.created_at).toLocaleDateString('es-CO')}
                    {p.last_used_at
                      ? ` · Último uso ${new Date(p.last_used_at).toLocaleDateString('es-CO')}`
                      : ' · Nunca usado'}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="p-2 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      aria-label={`Eliminar ${p.name}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar este passkey?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ya no podrás iniciar sesión con {p.name}. Esta acción no se puede
                        deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => handleDelete(p.id, p.name)}
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
