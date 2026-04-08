// src/components/auth/TwoFactorChallengeStep.tsx
// Paso de verificación 2FA mostrado tras un login con credenciales válidas
// cuando el backend devuelve `status: "2fa_required"`.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api/client';
import { OtpInput } from './OtpInput';
import { SubmitButton } from './SubmitButton';
import { LABEL_CLASS, LABEL_STYLE } from './constants';

interface TwoFactorChallengeStepProps {
  challengeToken: string;
  redirectTo?: string | null;
  onBack: () => void;
}

type Mode = 'totp' | 'backup';

const TOTP_LENGTH = 6;
const BACKUP_PATTERN = /^[A-Za-z0-9]{4}-?[A-Za-z0-9]{4}$/;

export function TwoFactorChallengeStep({
  challengeToken,
  redirectTo = null,
  onBack,
}: TwoFactorChallengeStepProps) {
  const { completeTwoFactorChallenge } = useAuth();
  const [mode, setMode] = useState<Mode>('totp');
  const [totpCode, setTotpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  // Focus automatico al cambiar de modo
  useEffect(() => {
    if (mode === 'backup') {
      backupInputRef.current?.focus();
    }
  }, [mode]);

  const clearAndFocus = useCallback(() => {
    if (mode === 'totp') {
      setTotpCode('');
    } else {
      setBackupCode('');
      backupInputRef.current?.focus();
    }
  }, [mode]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const rawCode = mode === 'totp' ? totpCode : backupCode.trim();

      if (mode === 'totp' && rawCode.length !== TOTP_LENGTH) {
        toast.error('Ingresa los 6 dígitos del código');
        return;
      }
      if (mode === 'backup' && !BACKUP_PATTERN.test(rawCode)) {
        toast.error('El código de respaldo debe tener el formato XXXX-XXXX');
        return;
      }

      setIsLoading(true);
      try {
        await completeTwoFactorChallenge(
          challengeToken,
          rawCode,
          redirectTo || undefined,
        );
        toast.success('¡Bienvenido!');
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : 'No pudimos verificar tu código. Intenta de nuevo.';
        toast.error(message);
        clearAndFocus();
      } finally {
        setIsLoading(false);
      }
    },
    [mode, totpCode, backupCode, challengeToken, completeTwoFactorChallenge, redirectTo, clearAndFocus],
  );

  const switchMode = (next: Mode) => {
    setMode(next);
    setTotpCode('');
    setBackupCode('');
  };

  return (
    <section aria-label="Verificación en dos pasos">
      <div className="mb-6">
        <h2
          className="text-[1.5rem] tracking-[-0.02em] mb-2"
          style={{
            color: 'var(--auth-primary)',
            fontWeight: 600,
            fontFamily: 'var(--auth-font-heading)',
          }}
        >
          Verifica tu identidad
        </h2>
        <p
          className="text-[0.85rem] leading-relaxed"
          style={{
            color: 'var(--auth-text-muted)',
            fontFamily: 'var(--auth-font-body)',
          }}
        >
          {mode === 'totp'
            ? 'Ingresa el código de 6 dígitos de tu app de autenticación para continuar.'
            : 'Ingresa uno de tus códigos de respaldo (formato XXXX-XXXX).'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {mode === 'totp' ? (
          <div className="space-y-2">
            <span className={LABEL_CLASS} style={LABEL_STYLE}>
              Código de verificación
            </span>
            <OtpInput
              value={totpCode}
              onChange={setTotpCode}
              disabled={isLoading}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <label
              htmlFor="backup-code"
              className={LABEL_CLASS}
              style={LABEL_STYLE}
            >
              Código de respaldo
            </label>
            <input
              id="backup-code"
              ref={backupInputRef}
              type="text"
              inputMode="text"
              autoComplete="one-time-code"
              placeholder="XXXX-XXXX"
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
              disabled={isLoading}
              maxLength={9}
              aria-required="true"
              className="h-[var(--auth-input-height)] w-full rounded-[var(--auth-radius-input)] border border-[var(--auth-border)] bg-[var(--auth-bg-input)] px-3 text-center text-[0.95rem] tracking-[0.2em] font-mono text-[var(--auth-text)] placeholder:text-[var(--auth-text-placeholder)] transition-[border-color,box-shadow] duration-[var(--auth-duration-fast)] ease-out focus-visible:border-[var(--auth-border-focus)] focus-visible:ring-[3px] focus-visible:ring-[var(--auth-accent)]/10 focus-visible:outline-none"
            />
          </div>
        )}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => switchMode(mode === 'totp' ? 'backup' : 'totp')}
            className="text-[0.75rem] font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm"
            style={{ color: 'var(--auth-accent, #0D9488)' }}
          >
            {mode === 'totp'
              ? 'Usar código de respaldo'
              : 'Usar código de la app'}
          </button>
        </div>

        <div className="pt-2">
          <SubmitButton isLoading={isLoading} loadingLabel="Verificando...">
            Verificar
          </SubmitButton>
        </div>
      </form>

      <div className="mt-6 pt-5 border-t border-gray-100 text-center">
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="text-[0.8rem] font-medium hover:underline underline-offset-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2 rounded-sm disabled:opacity-50"
          style={{ color: 'var(--auth-text-muted)' }}
        >
          Volver
        </button>
      </div>
    </section>
  );
}
