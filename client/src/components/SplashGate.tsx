import { useEffect, useState } from 'react';
import { AppLoader } from './Brand';

// Deja terminar la secuencia completa del splash — el logo se ensambla en
// 3 piezas (barra, aro y punto, ~1.2s) con destello al encajar, luego
// "Life OS" letra-por-letra (arranca a los 1250ms, termina ~2.8s) y por
// último la barra de progreso, que se deja varios ciclos visible (arranca
// a los 2600ms) antes de pasar a login/dashboard.
const SPLASH_DURATION = 5000;

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
