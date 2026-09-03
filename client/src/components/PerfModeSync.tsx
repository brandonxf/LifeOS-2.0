import { useEffect } from 'react';
import { useSettings } from '../store/settings';

/** Refleja `performanceModeEnabled` como la clase `perf-mode` en `<html>`,
 *  que index.css usa para apagar desenfoques y fondos animados en
 *  cualquier ancho de pantalla (a diferencia del `@media (max-width:900px)`
 *  ya existente, que solo actúa en pantallas angostas). No renderiza nada. */
export function PerfModeSync() {
  const enabled = useSettings((s) => s.performanceModeEnabled);

  useEffect(() => {
    document.documentElement.classList.toggle('perf-mode', enabled);
  }, [enabled]);

  return null;
}
