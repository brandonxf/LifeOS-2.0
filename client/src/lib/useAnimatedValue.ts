import { useEffect, useRef, useState } from 'react';
import { useSettings } from '../store/settings';

/** Devuelve `target` pero llegando a él con una animación (ease-out) en vez
 *  de saltar: la primera vez cuenta desde 0, y si `target` cambia a mitad de
 *  camino continúa desde donde iba. Sin animación en "Modo rendimiento" ni
 *  con `prefers-reduced-motion`. */
export function useAnimatedValue(target: number, duration = 800): number {
  const perfMode = useSettings((s) => s.performanceModeEnabled);
  const [value, setValue] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (perfMode || reduced) {
      current.current = target;
      setValue(target);
      return;
    }
    const origin = current.current;
    const start = performance.now();
    let raf = 0;
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      current.current = origin + (target - origin) * eased;
      setValue(current.current);
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, perfMode]);

  return value;
}
