import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { api } from '../lib/api';
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

  if (!enabled || unlocked) return <>{children}</>;

  async function verify(pin: string) {
    const res = await api<{ ok: boolean }>('/api/auth/diary-pin/verify', {
      method: 'POST',
      body: { pin },
    });
    return res.ok || 'PIN incorrecto';
  }

  return (
    <PinScreen
      title="Introduce el PIN del diario"
      onComplete={verify}
      onSuccess={() => setUnlocked(true)}
      onCancel={() => navigate('/dashboard')}
    />
  );
}
