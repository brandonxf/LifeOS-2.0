import { useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';

const BURST_DOTS = [0, 60, 120, 180, 240, 300];

/** true solo en el instante en que `done` pasa de false a true (nunca al
 *  desmarcar ni al montar ya en true) — dispara el destello de "completado". */
export function useCompletionPulse(done: boolean) {
  const [pulse, setPulse] = useState(false);
  const prev = useRef(done);

  useEffect(() => {
    if (done && !prev.current) {
      setPulse(true);
      const t = window.setTimeout(() => setPulse(false), 480);
      prev.current = done;
      return () => window.clearTimeout(t);
    }
    prev.current = done;
  }, [done]);

  return pulse;
}

/** Puntitos que salen disparados en círculo. El contenedor padre debe ser
 *  `relative` (o `position` no-estático) para que quede bien centrado. */
export function CompletionBurst({ show, color = 'rgb(var(--primary))' }: { show: boolean; color?: string }) {
  if (!show) return null;
  return (
    <span className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
      {BURST_DOTS.map((deg) => (
        <span
          key={deg}
          className="burst-dot absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color, ['--burst-deg' as string]: `${deg}deg` }}
        />
      ))}
    </span>
  );
}

/** Check que se "dibuja" con el trazo (SVG propio, no un ícono de Lucide,
 *  para poder usar pathLength=1 y animar el stroke sin depender de la
 *  geometría real del path). */
export function DrawnCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="draw-check"
      />
    </svg>
  );
}

/** Reemplazo de <input type="checkbox">: dibuja el check y lanza un
 *  destello solo al marcarlo (no al desmarcar ni al cargar ya marcado). */
export function AnimatedCheckbox({
  checked,
  onChange,
  color = 'rgb(var(--primary))',
  size = 20,
  className,
}: {
  checked: boolean;
  onChange: () => void;
  color?: string;
  size?: number;
  className?: string;
}) {
  const pulse = useCompletionPulse(checked);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-md border-2 border-slate-300 transition-colors dark:border-slate-600',
        className,
      )}
      style={{
        width: size,
        height: size,
        borderColor: checked ? color : undefined,
        backgroundColor: checked ? color : 'transparent',
      }}
    >
      <CompletionBurst show={pulse} color={color} />
      {checked && <DrawnCheck className="h-[70%] w-[70%] text-white" />}
    </button>
  );
}
