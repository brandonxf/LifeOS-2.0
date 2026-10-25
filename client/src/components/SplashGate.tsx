import { useEffect, useState } from 'react';
import { AppLoader } from './Brand';

// Deja terminar la animación del logo (LogoAnimated): trazo del isotipo
// (~1.75s), punto con rebote (~1.7s), letras de "Life OS" subiendo una a una
// (terminan a ~2.5s) y el resplandor (~2.8s), más un respiro antes de pasar
// a login/dashboard. Las animaciones no arrancan hasta que AppLoader confirma
// el primer frame pintado (ver useArmedAfterPaint en Brand.tsx) — este timer
// cuenta desde el montaje, así que ya incluye ese pequeño margen inicial.
const SPLASH_DURATION = 3000;

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
