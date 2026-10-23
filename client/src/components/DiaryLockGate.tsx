import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { api, ApiError } from '../lib/api';
import { hapticWarning } from '../lib/haptics';
import { PinScreen } from './PinScreen';

/** Pide el PIN del Diario (activado en Ajustes > Seguridad) antes de
 *  mostrar ese módulo. A diferencia de BiometricGate (bloquea toda la app
 *  y recuerda el desbloqueo mientras sigue en foreground), este vuelve a
 *  pedir el PIN cada vez que se entra: el estado "desbloqueado" vive
 *  solo en este componente, así que se reinicia cada vez que React lo
 *  vuelve a montar (al salir de /diary y volver a entrar). */
export function DiaryLockGate({ children }: { children: React.ReactNode }) {
  const enabled = useAuth((s) => s.user?.diaryLockEnabled ?? false);
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorSignal, setErrorSignal] = useState(0);
  const [checking, setChecking] = useState(false);

  if (!enabled || unlocked) return <>{children}</>;

  function fail(message: string) {
    setError(message);
    setErrorSignal((n) => n + 1);
    setPin('');
    hapticWarning();
  }

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
      if (res.ok) setUnlocked(true);
      else fail('PIN incorrecto');
    } catch (err) {
      fail(err instanceof ApiError ? err.message : 'No se pudo verificar el PIN');
    } finally {
      setChecking(false);
    }
  }

  return (
    <PinScreen
      title="Introduce el PIN del diario"
      value={pin}
      onChange={handleChange}
      disabled={checking}
      error={error}
      errorSignal={errorSignal}
      onCancel={() => navigate('/dashboard')}
    />
  );
}
