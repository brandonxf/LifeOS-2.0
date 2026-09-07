import { useEffect, useState } from 'react';
import { AppLoader } from './Brand';

// Deja terminar la secuencia completa del splash — el logo se ensambla en
// 3 piezas (barra, aro y punto, ~1.7s) con rebote + destello al encajar,
// luego "Life OS" letra-por-letra (arranca a los 1750ms, termina ~3.3s) y
// por último la barra de progreso, que se deja varios ciclos visible
// (arranca a los 3100ms) antes de pasar a login/dashboard. Las animaciones
// no arrancan hasta que AppLoader confirma el primer frame pintado (ver
// useArmedAfterPaint en Brand.tsx) — este timer cuenta desde el montaje,
// así que ya incluye ese pequeño margen inicial.
const SPLASH_DURATION = 5800;

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
