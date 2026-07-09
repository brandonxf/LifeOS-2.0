import { useId } from 'react';
import { cn } from '../lib/utils';

/**
 * Marca de la app "Life OS": un núcleo con una órbita — tu vida (los módulos)
 * girando alrededor de un centro personal. Tile con gradiente de marca.
 */
export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7B78F5" />
          <stop offset="0.55" stopColor="#5A4FE0" />
          <stop offset="1" stopColor="#3D359E" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${id}-tile)`} />
      {/* Órbita */}
      <ellipse
        cx="32"
        cy="32"
        rx="19"
        ry="8.5"
        transform="rotate(-28 32 32)"
        stroke="#fff"
        strokeOpacity="0.9"
        strokeWidth="2.75"
        fill="none"
      />
      {/* Núcleo */}
      <circle cx="32" cy="32" r="6.5" fill="#fff" />
      {/* Satélite sobre la órbita */}
      <circle cx="47.5" cy="20.5" r="3.4" fill="#fff" />
    </svg>
  );
}

/** Logo + wordmark en Sora. `light` para fondos oscuros. */
export function Wordmark({
  size = 32,
  className,
  textClass,
}: {
  size?: number;
  className?: string;
  textClass?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Logo size={size} />
      <span className={cn('font-display text-lg font-extrabold tracking-tight', textClass)}>Life&nbsp;OS</span>
    </div>
  );
}

/** Órbita animada para pantallas de carga: núcleo que late + satélite que gira. */
export function BrandSpinner({ size = 96, className }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8688f6" />
          <stop offset="1" stopColor="#5A4FE0" />
        </linearGradient>
      </defs>
      <g className="animate-orbit">
        <ellipse
          cx="60"
          cy="60"
          rx="46"
          ry="18"
          transform="rotate(-24 60 60)"
          stroke={`url(#${id}-s)`}
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.55"
        />
        <circle cx="102" cy="41.3" r="6" fill="#2dd4e7" />
      </g>
      <circle cx="60" cy="60" r="12" fill={`url(#${id}-s)`} className="animate-pulse-soft" />
    </svg>
  );
}

/** Fondo ambiental de "aurora" — blobs difuminados que flotan. Va en un contenedor relativo. */
export function Ambient({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}>
      <div className="animate-blob absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
      <div className="animate-blob absolute -right-16 top-1/3 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl [animation-delay:3s]" />
      <div className="animate-blob absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl [animation-delay:6s]" />
    </div>
  );
}

/** Pantalla de carga de marca a pantalla completa (transición al entrar a la app). */
export function AppLoader({ label = 'Preparando tu espacio…' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[60] flex animate-fade-in flex-col items-center justify-center gap-7 bg-ink-950 text-center">
      <Ambient />
      <div className="relative z-10 flex flex-col items-center gap-7">
        <BrandSpinner size={112} />
        <div>
          <p className="font-display text-xl font-extrabold text-white">Life&nbsp;OS</p>
          <p className="mt-1 text-sm text-slate-400">{label}</p>
        </div>
        <div className="progress-track h-1.5 w-52" />
      </div>
    </div>
  );
}

/**
 * Marca de la IA: una chispa-aurora en gradiente cian→iris→magenta.
 * Distinta del logo de la app a propósito. Transparente, va inline.
 */
export function AiMark({ size = 20, className }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-ai`} x1="6" y1="8" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2DD4E7" />
          <stop offset="0.5" stopColor="#6D68EE" />
          <stop offset="1" stopColor="#C026D3" />
        </linearGradient>
      </defs>
      {/* Chispa principal (estrella cóncava de 4 puntas) */}
      <path
        d="M34 3c1.6 14.8 10.2 23.4 25 25-14.8 1.6-23.4 10.2-25 25-1.6-14.8-10.2-23.4-25-25 14.8-1.6 23.4-10.2 25-25Z"
        fill={`url(#${id}-ai)`}
      />
      {/* Chispa secundaria */}
      <path
        d="M13 40c.6 5.4 3.6 8.4 9 9-5.4.6-8.4 3.6-9 9-.6-5.4-3.6-8.4-9-9 5.4-.6 8.4-3.6 9-9Z"
        fill={`url(#${id}-ai)`}
        opacity="0.85"
      />
    </svg>
  );
}
