import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/utils';
import { avatarSrc } from '../lib/avatar';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('card', className)}>{children}</div>;
}

/** Círculo con la foto de alguien, o su inicial si no tiene avatar. */
export function Avatar({ name, avatar, size = 36 }: { name: string; avatar: string | null; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 font-bold text-primary"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {avatarSrc(avatar) ? <img src={avatarSrc(avatar)} alt="" className="h-full w-full object-cover" /> : name?.[0]?.toUpperCase()}
    </div>
  );
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

/** Visor de imagen a pantalla completa: toca una miniatura y se abre para
 *  verla bien, con flechas para pasar a la siguiente/anterior si hay más
 *  de una. Cierra con Escape, con el fondo, o con la X. */
export function Lightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: string[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndexChange((index + 1) % images.length);
      if (e.key === 'ArrowLeft') onIndexChange((index - 1 + images.length) % images.length);
    }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [index, images.length, onClose, onIndexChange]);

  return createPortal(
    <div className="fixed inset-0 z-[110] flex animate-fade-in items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        style={{ top: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
        <X className="h-5 w-5" />
      </button>
      {images.length > 1 && (
        <>
          <button
            onClick={() => onIndexChange((index - 1 + images.length) % images.length)}
            aria-label="Foto anterior"
            className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-4"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={() => onIndexChange((index + 1) % images.length)}
            aria-label="Foto siguiente"
            className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-4"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
      <img
        src={images[index]}
        alt=""
        className="relative z-0 max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white">
          {index + 1} / {images.length}
        </div>
      )}
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

/** Input de contraseña con botón de ojito para mostrar/ocultar el texto. */
export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function PasswordInput({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <div className="relative">
        <input ref={ref} {...props} type={visible ? 'text' : 'password'} className={cn(className, 'pr-10')} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 transition hover:text-white"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);

/** Lista de amigos para elegir a quién invitar/asignar a algo (un hábito
 *  compartido, una tarea en equipo, etc). Genérico: no sabe nada de hábitos
 *  ni tareas, solo recibe candidatos ya filtrados por el llamador. */
export function FriendPickerModal({
  open, title, candidates, onClose, onPick, pending, emptyMessage,
}: {
  open: boolean;
  title: string;
  candidates: { id: string; name: string; avatar: string | null }[];
  onClose: () => void;
  onPick: (id: string) => void;
  pending: boolean;
  emptyMessage: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      {!candidates.length ? (
        <p className="text-sm text-slate-400">{emptyMessage}</p>
      ) : (
        <div className="divide-y">
          {candidates.map((f) => (
            <div key={f.id} className="flex items-center gap-3 py-2.5">
              <Avatar name={f.name} avatar={f.avatar} size={32} />
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{f.name}</p>
              <button onClick={() => onPick(f.id)} disabled={pending} className="btn-primary h-8 px-3 text-xs">Elegir</button>
            </div>
          ))}
        </div>
      )}
    </Modal>
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
