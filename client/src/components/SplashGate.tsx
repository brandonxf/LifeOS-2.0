import { useEffect, useState } from 'react';
import { AppLoader } from './Brand';

// Deja terminar la secuencia completa del splash — el logo se ensambla en
// 3 piezas (barra, aro y punto) con rebote + destello al encajar (~1.14s,
// versión comprimida de la animación original), luego "Life OS"
// letra-por-letra (arranca a los 900ms, justo cuando el punto encaja,
// termina ~1.67s) antes de pasar a login/dashboard. Las animaciones no
// arrancan hasta que AppLoader confirma el primer frame pintado (ver
// useArmedAfterPaint en Brand.tsx) — este timer cuenta desde el montaje,
// así que ya incluye ese pequeño margen inicial.
const SPLASH_DURATION = 1800;

/** Splash de marca al abrir la app: se muestra una sola vez al arrancar,
 *  antes que nada más (login incluido). */
export function SplashGate({ children }: { children: React.ReactNode }) {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), SPLASH_DURATION);
    return () => clearTimeout(t);
  }, []);

  if (showSplash) return <AppLoader />;
  return <>{children}</>;
}
