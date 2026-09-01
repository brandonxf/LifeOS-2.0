import { useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Fingerprint } from 'lucide-react';
import { useSettings } from '../store/settings';
import { verifyBiometric } from '../lib/biometric';
import { Logo } from './Brand';

const native = Capacitor.isNativePlatform();

/** Otras partes de la app (ej. el selector de fotos del diario) abren un
 *  Activity nativo que también pausa y reanuda la app, como el diálogo de
 *  huella. Antes de lanzar ese tipo de flujo, márcalo con
 *  `externalPickerOpen.current = true` y vuelve a ponerlo en `false` (con un
 *  pequeño margen) cuando termine, para que no dispare el bloqueo. */
export const externalPickerOpen = { current: false };

/** Bloquea toda la app detrás de huella/rostro cuando el usuario activó
 *  "Bloqueo biométrico" en Ajustes. Se dispara al abrir la app y cada vez
 *  que vuelve de segundo plano (no solo en el primer render), para que no
 *  baste con minimizarla para saltarse el bloqueo. */
export function BiometricGate({ children }: { children: React.ReactNode }) {
  const enabled = useSettings((s) => s.biometricLockEnabled);
  const [locked, setLocked] = useState(enabled && native);
  const checking = useRef(false);
  // El propio diálogo nativo de huella pausa y reanuda la Activity al
  // abrirse/cerrarse, lo que dispara "appStateChange" como si el usuario
  // hubiera salido y vuelto a la app. Mientras el diálogo está abierto (y un
  // margen después de que se cierra) ignoramos esos eventos para no volver
  // a pedir la huella en bucle justo después de verificarla con éxito.
  const promptOpen = useRef(false);

  async function tryUnlock() {
    if (checking.current) return;
    checking.current = true;
    promptOpen.current = true;
    const ok = await verifyBiometric();
    checking.current = false;
    setLocked(!ok);
    setTimeout(() => { promptOpen.current = false; }, 500);
  }

  useEffect(() => {
    if (!enabled || !native) {
      setLocked(false);
      return;
    }
    setLocked(true);
    tryUnlock();

    const sub = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive && !promptOpen.current && !externalPickerOpen.current) {
        setLocked(true);
        tryUnlock();
      }
    });
    return () => {
      sub.then((s) => s.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!locked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-ink-950 text-center">
      <Logo size={56} />
      <div className="flex flex-col items-center gap-3">
        <Fingerprint className="h-10 w-10 text-primary" />
        <p className="text-sm text-white/60">Life OS está bloqueado</p>
      </div>
      <button onClick={tryUnlock} className="btn-primary px-6">
        Desbloquear
      </button>
    </div>
  );
}
