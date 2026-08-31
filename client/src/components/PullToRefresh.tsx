import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

const THRESHOLD = 70; // px de arrastre para disparar el refresco
const MAX_PULL = 90;

/** Envuelve un área desplazable y refresca los datos al arrastrar hacia abajo
 *  desde el tope (solo táctil). En desktop no hace nada. */
export function PullToRefresh({ children, className }: { children: ReactNode; className?: string }) {
  const qc = useQueryClient();
  const el = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // Solo true durante la breve animación de retorno tras soltar; controla si
  // el wrapper de `children` lleva `transform` puesto o no.
  const [transitioning, setTransitioning] = useState(false);
  const settleTimeout = useRef<number | null>(null);

  useEffect(() => {
    const node = el.current;
    if (!node) return;

    function clearSettleTimeout() {
      if (settleTimeout.current != null) {
        window.clearTimeout(settleTimeout.current);
        settleTimeout.current = null;
      }
    }

    // Deja el wrapper de `children` sin `transform` en reposo: cualquier
    // ancestro con `transform` (incluso translateY(0px)) crea un nuevo
    // containing block y rompe el `position: fixed` que usa el
    // drag-and-drop de tareas, desincronizando el cursor de la tarjeta.
    function scheduleSettle() {
      clearSettleTimeout();
      settleTimeout.current = window.setTimeout(() => setTransitioning(false), 260);
    }

    function onStart(e: TouchEvent) {
      if (!refreshingRef.current && node!.scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
      } else {
        startY.current = null;
      }
    }

    function onMove(e: TouchEvent) {
      if (startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && node!.scrollTop <= 0) {
        e.preventDefault();
        clearSettleTimeout();
        const damped = Math.min(dy * 0.5, MAX_PULL);
        pullRef.current = damped;
        setPull(damped);
        setTransitioning(false);
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    }

    async function onEnd() {
      if (startY.current == null) return;
      startY.current = null;
      setTransitioning(true);
      if (pullRef.current >= THRESHOLD) {
        refreshingRef.current = true;
        setRefreshing(true);
        pullRef.current = 44;
        setPull(44);
        try {
          await qc.invalidateQueries();
        } catch {
          /* noop */
        }
        window.setTimeout(() => {
          refreshingRef.current = false;
          setRefreshing(false);
          pullRef.current = 0;
          setPull(0);
          scheduleSettle();
        }, 400);
      } else {
        pullRef.current = 0;
        setPull(0);
        scheduleSettle();
      }
    }

    node.addEventListener('touchstart', onStart, { passive: true });
    node.addEventListener('touchmove', onMove, { passive: false });
    node.addEventListener('touchend', onEnd, { passive: true });
    node.addEventListener('touchcancel', onEnd, { passive: true });
    return () => {
      node.removeEventListener('touchstart', onStart);
      node.removeEventListener('touchmove', onMove);
      node.removeEventListener('touchend', onEnd);
      node.removeEventListener('touchcancel', onEnd);
      clearSettleTimeout();
    };
  }, [qc]);

  const active = pull !== 0 || transitioning;

  return (
    <div ref={el} className={cn('relative', className)}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
        style={{ transform: `translateY(${pull - 34}px)`, opacity: Math.min(pull / THRESHOLD, 1) }}
      >
        <Loader2 className={cn('h-6 w-6 text-primary', refreshing && 'animate-spin')} />
      </div>
      <div style={active ? { transform: `translateY(${pull}px)`, transition: transitioning ? 'transform 0.25s ease' : 'none' } : undefined}>
        {children}
      </div>
    </div>
  );
}
