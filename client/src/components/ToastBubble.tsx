import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { resolveValue, ToastIcon, type Toast } from 'react-hot-toast';
import { Logo } from './Brand';
import { cn } from '../lib/utils';

const COLLAPSED = 44; // px — burbuja cerrada: solo el logo, circular
const RIGHT_PAD = 16; // px — aire a la derecha del texto cuando está expandida

/** Notificación tipo "burbuja": arranca como el isotipo solo (círculo) y,
 *  tras un instante, se abre hacia los lados revelando el mensaje — el
 *  mismo gesto de las burbujas flotantes de Samsung. Sustituye por completo
 *  al ToastBar de react-hot-toast vía el render-prop `children` de
 *  `<Toaster>`, así que los `toast.success(...)` existentes no cambian. */
export function ToastBubble({ t }: { t: Toast }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'enter' | 'pop' | 'expand'>('enter');
  const [expandedWidth, setExpandedWidth] = useState(COLLAPSED);

  useLayoutEffect(() => {
    if (contentRef.current) {
      setExpandedWidth(contentRef.current.scrollWidth + COLLAPSED + RIGHT_PAD);
    }
  }, [t.message]);

  useEffect(() => {
    if (!t.visible) return;
    const pop = requestAnimationFrame(() => setPhase('pop'));
    const expand = window.setTimeout(() => setPhase('expand'), 190);
    return () => {
      cancelAnimationFrame(pop);
      window.clearTimeout(expand);
    };
    // Solo al aparecer un toast nuevo (por id), no en cada re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t.id]);

  const popped = phase !== 'enter';
  const expanded = phase === 'expand';

  return (
    <div
      role={t.ariaProps.role}
      aria-live={t.ariaProps['aria-live']}
      className={cn(
        'toast-bubble flex items-center overflow-hidden rounded-full border border-slate-200/80 bg-white shadow-glass-lg dark:border-white/10 dark:bg-ink-900/95',
        !t.visible && 'pointer-events-none',
      )}
      style={{
        height: COLLAPSED,
        width: expanded ? expandedWidth : COLLAPSED,
        transform: popped && t.visible ? 'scale(1)' : 'scale(0.4)',
        opacity: popped && t.visible ? 1 : 0,
        transition:
          'width 340ms cubic-bezier(0.34,1.56,0.64,1), transform 260ms cubic-bezier(0.34,1.56,0.64,1), opacity 220ms ease-out',
      }}
    >
      <span className="flex shrink-0 items-center justify-center" style={{ width: COLLAPSED, height: COLLAPSED }}>
        <Logo size={24} />
      </span>
      <div
        ref={contentRef}
        className={cn(
          'flex shrink-0 items-center gap-2 whitespace-nowrap pr-4 text-sm font-medium text-slate-700 transition-opacity duration-200 dark:text-slate-100',
          expanded ? 'opacity-100 delay-100' : 'opacity-0',
        )}
      >
        <ToastIcon toast={t} />
        <span>{resolveValue(t.message, t)}</span>
      </div>
    </div>
  );
}
