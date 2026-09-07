import { useEffect, useState } from 'react';
import { AppLoader } from './Brand';

// Deja terminar la secuencia completa del splash — logo (zambullida +
// destello, ~0.9s), luego "Life OS" letra-por-letra (arranca a los 550ms,
// termina ~2.1s) y por último la barra de progreso, que se deja varios
// ciclos visible (arranca a los 1900ms) antes de pasar a login/dashboard.
const SPLASH_DURATION = 4200;

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
