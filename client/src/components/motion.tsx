import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';
import { useAnimatedValue } from '../lib/useAnimatedValue';

/** Número que cuenta hasta `value` en vez de aparecer de golpe. `format`
 *  recibe el valor intermedio (con decimales), así que debe redondear. */
export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  duration,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const v = useAnimatedValue(value, duration);
  return <>{format(v)}</>;
}

/** Barra de progreso que se llena desde 0 hasta `pct` al aparecer (y se
 *  anima cuando `pct` cambia). `className` es el riel (alto, fondo) y
 *  `barClassName` el relleno (color); el relleno siempre ocupa todo el alto. */
export function ProgressBar({
  pct,
  className,
  barClassName,
}: {
  pct: number;
  className?: string;
  barClassName?: string;
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setWidth(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  return (
    <div className={cn('overflow-hidden rounded-full', className)}>
      <div className={cn('progress-fill h-full rounded-full', barClassName)} style={{ width: `${width}%` }} />
    </div>
  );
}
