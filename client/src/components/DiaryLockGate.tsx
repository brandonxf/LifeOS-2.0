import { useState } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '../store/auth';
import { api, ApiError } from '../lib/api';
import { PinInput } from './PinInput';
import { Logo } from './Brand';

/** Pide el PIN del Diario (activado en Ajustes > Seguridad) antes de
 *  mostrar ese módulo. A diferencia de BiometricGate (bloquea toda la app
 *  y recuerda el desbloqueo mientras sigue en foreground), este vuelve a
 *  pedir el PIN cada vez que se entra: el estado "desbloqueado" vive
 *  solo en este componente, así que se reinicia cada vez que React lo
 *  vuelve a montar (al salir de /diary y volver a entrar). */
export function DiaryLockGate({ children }: { children: React.ReactNode }) {
  const enabled = useAuth((s) => s.user?.diaryLockEnabled ?? false);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  if (!enabled || unlocked) return <>{children}</>;

  async function handleChange(v: string) {
    setError(null);
    setPin(v);
    if (v.length < 4) return;
    setChecking(true);
    try {
      const res = await api<{ ok: boolean }>('/api/auth/diary-pin/verify', {
        method: 'POST',
        body: { pin: v },
      });
      if (res.ok) {
        setUnlocked(true);
      } else {
        setError('PIN incorrecto');
        setPin('');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo verificar el PIN');
      setPin('');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-ink-950 px-6 text-center">
      <Logo size={56} />
      <div className="flex flex-col items-center gap-2">
        <Lock className="h-10 w-10 text-primary" />
        <p className="text-sm text-white/60">Tu diario está bloqueado</p>
      </div>
      <PinInput value={pin} onChange={handleChange} disabled={checking} glass />
      <p className="h-5 text-sm text-red-400">{error}</p>
    </div>
  );
}
