import { useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../store/auth';
import { api, ApiError } from '../lib/api';
import { PasswordInput } from './ui';
import { Logo } from './Brand';

/** Pide la clave del Diario (activada en Ajustes > Seguridad) antes de
 *  mostrar ese módulo. A diferencia de BiometricGate (bloquea toda la app
 *  y recuerda el desbloqueo mientras sigue en foreground), este vuelve a
 *  pedir la clave cada vez que se entra: el estado "desbloqueado" vive
 *  solo en este componente, así que se reinicia cada vez que React lo
 *  vuelve a montar (al salir de /diary y volver a entrar). */
export function DiaryLockGate({ children }: { children: React.ReactNode }) {
  const enabled = useAuth((s) => s.user?.diaryLockEnabled ?? false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  if (!enabled || unlocked) return <>{children}</>;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pin || checking) return;
    setChecking(true);
    setError(null);
    try {
      const res = await api<{ ok: boolean }>('/api/auth/diary-pin/verify', {
        method: 'POST',
        body: { pin },
      });
      if (res.ok) {
        setUnlocked(true);
      } else {
        setError('Clave incorrecta');
        setPin('');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo verificar la clave');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-ink-950 px-6 text-center">
      <Logo size={56} />
      <div className="flex flex-col items-center gap-3">
        <Lock className="h-10 w-10 text-primary" />
        <p className="text-sm text-white/60">Tu diario está bloqueado</p>
      </div>
      <form onSubmit={onSubmit} className="flex w-full max-w-xs flex-col items-center gap-3">
        <PasswordInput
          className="input-glass"
          placeholder="Clave del diario"
          autoFocus
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setError(null);
          }}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={checking || !pin}>
          {checking ? 'Verificando…' : 'Desbloquear'}
        </button>
      </form>
    </div>
  );
}
