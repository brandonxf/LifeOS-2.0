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
          <stop stopColor="#dcff85" />
          <stop offset="0.55" stopColor="#c4f82a" />
          <stop offset="1" stopColor="#97c910" />
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
        stroke="#080a08"
        strokeOpacity="0.9"
        strokeWidth="2.75"
        fill="none"
      />
      {/* Núcleo */}
      <circle cx="32" cy="32" r="6.5" fill="#080a08" />
      {/* Satélite sobre la órbita */}
      <circle cx="47.5" cy="20.5" r="3.4" fill="#080a08" />
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
          <stop stopColor="#dcff85" />
          <stop offset="1" stopColor="#c4f82a" />
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
        <circle cx="102" cy="41.3" r="6" fill="#c4f82a" />
      </g>
      <circle cx="60" cy="60" r="12" fill={`url(#${id}-s)`} className="animate-pulse-soft" />
    </svg>
  );
}

/** Ilustración de línea espacial para el panel de marca del login (cohete + planeta + órbita). */
export function AuthArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" fill="none" className={className} aria-hidden="true">
      <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        {/* Cohete */}
        <path
          d="M120 60c12 12 18 33 18 60v28c0 8-6 14-18 14s-18-6-18-14v-28c0-27 6-48 18-60Z"
          opacity="0.95"
        />
        <circle cx="120" cy="108" r="9" opacity="0.95" />
        {/* Aletas */}
        <path d="M102 150c-12 4-18 12-18 22 8 0 14-4 18-10" opacity="0.9" />
        <path d="M138 150c12 4 18 12 18 22-8 0-14-4-18-10" opacity="0.9" />
        {/* Propulsión */}
        <path d="M112 176c-3 6-3 12 0 18M128 176c3 6 3 12 0 18M120 178v20" opacity="0.7" />
        {/* Horizonte del planeta */}
        <path d="M46 210q74-26 148 0" strokeDasharray="2 10" opacity="0.75" />
        {/* Órbita de marca (guiño al logo) */}
        <ellipse cx="186" cy="66" rx="20" ry="8" transform="rotate(-24 186 66)" opacity="0.5" />
        <circle cx="186" cy="66" r="3.4" fill="currentColor" stroke="none" />
      </g>
      {/* Estrellas */}
      <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.85">
        <path d="M64 96l0 10M59 101l10 0" />
        <path d="M176 150l0 8M172 154l8 0" />
        <path d="M58 158l0 8M54 162l8 0" />
      </g>
      <g fill="currentColor" opacity="0.7">
        <circle cx="94" cy="70" r="2" />
        <circle cx="150" cy="88" r="2" />
        <circle cx="80" cy="132" r="1.8" />
      </g>
    </svg>
  );
}

/** Fondo ambiental de "aurora" — blobs difuminados que flotan. Va en un contenedor relativo. */
export function Ambient({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}>
      <div className="animate-blob absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
      <div className="animate-blob absolute -right-16 top-1/3 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl [animation-delay:3s]" />
      <div className="animate-blob absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-lime-400/10 blur-3xl [animation-delay:6s]" />
    </div>
  );
}

/** Pantalla de carga de marca a pantalla completa (transición al entrar a la app). */
export function AppLoader({ label = 'Preparando tu espacio…' }: { label?: string }) {
  const word = 'Life OS';
  return (
    <div className="fixed inset-0 z-[60] flex animate-fade-in flex-col items-center justify-center gap-10 bg-ink-950 text-center">
      <Ambient />
      <div className="relative z-10 flex flex-col items-center gap-8">
        <h1
          aria-label={word}
          className="font-display text-6xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_30px_rgba(196,248,42,0.45)] sm:text-8xl"
        >
          {word.split('').map((ch, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="loader-letter"
              style={{ animationDelay: `${i * 150}ms` }}
            >
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </h1>
        <div className="flex flex-col items-center gap-4">
          <div className="progress-track h-1.5 w-56" />
          <p className="text-sm text-slate-400">{label}</p>
        </div>
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
          <stop stopColor="#c4f82a" />
          <stop offset="0.5" stopColor="#34d399" />
          <stop offset="1" stopColor="#22d3ee" />
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
