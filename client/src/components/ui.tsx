import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('card', className)}>{children}</div>;
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-[2.5rem] sm:leading-[1.05]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-slate-500 dark:text-white/50">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 py-16 text-center dark:border-white/10">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
    />
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  // Portal a document.body: evita que una superficie glass ancestro
  // (backdrop-filter/transform) recorte el overlay fixed a su propia caja.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={onClose} />
      <div
        className={cn(
          'glass-menu relative z-10 max-h-[85vh] w-full overflow-y-auto animate-fade-in rounded-3xl border border-slate-200 bg-white p-6 shadow-glass-lg dark:border-white/10 dark:bg-ink-900/85 dark:backdrop-blur-2xl',
          wide ? 'max-w-2xl' : 'max-w-md',
        )}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

/** Bloque de texto (o HTML) que se recorta a N líneas y, solo si de verdad
 *  no cabe, muestra un botón "Ver más" para expandirlo (y "Ver menos" para
 *  volver a recortarlo). Se remide con ResizeObserver porque el mismo
 *  contenido puede desbordar o no según el ancho disponible. */
export function ExpandableText({
  children,
  html,
  lines = 3,
  className,
  textClassName,
}: {
  children?: ReactNode;
  html?: string;
  lines?: number;
  className?: string;
  textClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    function measure() {
      if (expanded) return;
      setOverflowing(node!.scrollHeight - node!.clientHeight > 1);
    }
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [children, html, expanded, lines]);

  const clampStyle = expanded
    ? undefined
    : { display: '-webkit-box', WebkitLineClamp: lines, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' };

  return (
    <div className={className}>
      <div
        ref={ref}
        style={clampStyle}
        className={textClassName}
        {...(html !== undefined ? { dangerouslySetInnerHTML: { __html: html } } : { children })}
      />
      {overflowing && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
          className="mt-1 text-xs font-semibold text-primary hover:underline"
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  accent = 'text-primary',
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="card">
      <p className="eyebrow">{label}</p>
      <p className={cn('num mt-2 text-3xl font-bold', accent)}>{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
