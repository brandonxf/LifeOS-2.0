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
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const node = el.current;
    if (!node) return;

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
        const damped = Math.min(dy * 0.5, MAX_PULL);
        pullRef.current = damped;
        setPull(damped);
        setAnimating(false);
      } else {
        pullRef.current = 0;
        setPull(0);
      }
    }

    async function onEnd() {
      if (startY.current == null) return;
      startY.current = null;
      setAnimating(true);
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
        }, 400);
      } else {
        pullRef.current = 0;
        setPull(0);
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
    };
  }, [qc]);

  return (
    <div ref={el} className={cn('relative', className)}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center"
        style={{ transform: `translateY(${pull - 34}px)`, opacity: Math.min(pull / THRESHOLD, 1) }}
      >
        <Loader2 className={cn('h-6 w-6 text-primary', refreshing && 'animate-spin')} />
      </div>
      <div style={{ transform: `translateY(${pull}px)`, transition: animating ? 'transform 0.25s ease' : 'none' }}>
        {children}
      </div>
    </div>
  );
}
