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
