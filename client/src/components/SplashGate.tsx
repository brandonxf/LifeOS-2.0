import { useEffect, useState } from 'react';
import { AppLoader } from './Brand';

// Deja terminar la animación letra-por-letra de "Life OS" (dura ~1.5s) con
// un pequeño margen antes de pasar a login/dashboard.
const SPLASH_DURATION = 1900;

/** Splash de marca al abrir la app: se muestra una sola vez al arrancar,
 *  antes que nada más (login incluido). */
export function SplashGate({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), SPLASH_DURATION);
    return () => clearTimeout(t);
  }, []);

  if (showSplash) return <AppLoader label="Preparando tu espacio…" />;
  return <>{children}</>;
}
