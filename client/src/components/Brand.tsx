import { useId } from 'react';
import { cn } from '../lib/utils';

/** Marca de la app "Life OS": el isotipo oficial (mismo mark en toda la app
 *  y en los recursos nativos de Android). SVG a `currentColor` para que siga
 *  el acento elegido por el usuario; por defecto pinta con `text-primary`. */
export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 1312 1199"
      width={size}
      height={size}
      className={cn('shrink-0 text-primary', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Life OS"
    >
      <g transform="translate(0,1199) scale(0.1,-0.1)" fill="currentColor">
        <path d="M2331 11468 c-41 -5 -117 -23 -170 -40 -173 -55 -290 -125 -412 -247 -146 -146 -238 -320 -284 -536 -13 -61 -15 -449 -15 -3012 0 -1896 4 -2997 10 -3095 31 -462 136 -917 305 -1328 56 -135 184 -391 267 -530 132 -223 226 -354 448 -625 134 -163 446 -456 680 -637 274 -212 702 -456 1020 -583 52 -21 127 -50 165 -65 39 -16 129 -46 200 -69 618 -192 1111 -251 1915 -231 1087 28 1316 55 1583 185 89 43 208 141 272 223 205 260 227 635 56 932 -61 104 -201 240 -312 302 -172 96 -286 111 -684 90 -431 -22 -1147 -22 -1340 1 -713 85 -1282 315 -1745 703 -230 193 -449 481 -571 750 -82 181 -155 427 -190 644 -28 172 -29 257 -32 3685 -2 2429 -3 2585 -20 2662 -42 197 -135 377 -263 513 -223 236 -549 350 -883 308z M6020 10769 c-329 -22 -653 -72 -810 -126 -343 -116 -557 -385 -577 -728 -13 -223 59 -415 217 -576 128 -130 290 -206 486 -229 79 -9 149 -8 349 5 946 60 1490 8 2063 -196 279 -99 599 -263 851 -436 686 -469 1195 -1145 1445 -1920 70 -215 90 -288 121 -448 173 -876 0 -1803 -482 -2579 -81 -131 -214 -312 -308 -421 -126 -145 -193 -254 -229 -375 -26 -83 -32 -259 -12 -350 31 -147 134 -317 250 -411 82 -67 222 -134 321 -155 113 -23 272 -15 381 20 194 62 382 225 666 576 82 102 103 130 216 293 102 147 243 391 337 582 274 558 436 1112 501 1720 20 192 24 674 5 865 -24 258 -77 573 -142 850 -49 208 -166 576 -225 707 -14 32 -44 103 -66 158 -75 188 -227 473 -412 775 -289 470 -760 988 -1232 1356 -745 579 -1587 916 -2564 1025 -150 17 -263 22 -600 24 -228 2 -476 -1 -550 -6z M6385 6599 c-434 -63 -824 -346 -1010 -734 -225 -467 -160 -1003 169 -1412 130 -161 308 -294 502 -376 205 -86 348 -112 573 -104 239 8 433 69 643 201 297 186 517 499 589 837 32 147 33 411 2 549 -122 547 -555 953 -1100 1035 -110 16 -271 18 -368 4z" />
      </g>
    </svg>
  );
}

/** Isotipo + "Life OS" en un solo lockup. El isotipo y "OS" siguen el acento
 *  (`currentColor`, `text-primary` por defecto); "Life" queda en blanco opaco
 *  a propósito: solo úsalo sobre fondos oscuros fijos (paneles de auth),
 *  nunca donde pueda caer sobre un fondo claro. */
export function LogoLockup({ width = 220, className }: { width?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 1536 1024"
      width={width}
      className={cn('h-auto text-primary', className)}
      role="img"
      aria-label="Life OS"
    >
      <g transform="translate(0,1024) scale(0.1,-0.1)">
        <g fill="currentColor">
          <path d="M5575 9012 c-120 -41 -196 -109 -249 -221 l-31 -66 0 -1445 c0 -1143 3 -1463 13 -1530 72 -464 280 -870 610 -1192 150 -146 201 -188 342 -283 477 -321 1078 -454 1645 -364 165 26 212 40 285 84 71 43 115 91 149 165 21 46 26 70 26 145 0 78 -4 98 -28 150 -37 79 -104 147 -181 181 -52 24 -75 28 -151 28 -49 1 -143 -7 -208 -16 -313 -47 -602 -4 -885 132 -214 103 -386 245 -530 435 -88 117 -128 186 -182 321 -57 139 -79 235 -90 386 -5 71 -10 724 -10 1450 0 936 -3 1332 -11 1362 -25 94 -84 178 -157 224 -107 69 -252 91 -357 54z M7135 8690 c-254 -20 -400 -138 -434 -350 -23 -144 37 -284 158 -368 109 -76 164 -84 436 -63 555 44 1046 -135 1416 -515 219 -226 358 -470 433 -765 111 -435 52 -849 -174 -1233 -42 -71 -107 -157 -193 -256 -71 -80 -90 -122 -95 -210 -5 -101 20 -170 94 -249 141 -153 372 -169 548 -39 132 98 336 384 444 623 67 147 134 349 157 470 32 170 35 200 45 358 28 480 -86 945 -332 1356 -312 519 -774 900 -1343 1109 -131 48 -221 72 -410 108 -124 23 -168 27 -395 29 -140 2 -300 0 -355 -5z M7480 6804 c-211 -45 -393 -222 -446 -434 -22 -86 -15 -261 13 -341 82 -238 308 -399 558 -399 247 0 474 156 561 386 31 82 44 247 25 333 -34 161 -160 321 -313 399 -133 68 -260 86 -398 56z M11684 3285 c-279 -43 -487 -179 -584 -382 -41 -86 -52 -142 -51 -253 2 -229 90 -375 301 -496 80 -46 248 -97 503 -153 242 -54 352 -99 404 -168 22 -29 28 -49 31 -102 4 -62 2 -69 -30 -115 -118 -172 -503 -195 -796 -47 -42 22 -94 51 -115 65 -101 69 -152 75 -202 21 -39 -40 -87 -124 -105 -178 -17 -55 1 -90 74 -144 216 -159 549 -242 859 -214 464 42 751 285 751 636 0 190 -75 324 -241 434 -98 65 -258 119 -571 191 -275 63 -371 111 -418 206 -22 45 -26 63 -21 105 19 155 135 237 352 247 163 7 328 -31 480 -112 76 -40 131 -47 163 -18 27 23 100 148 114 196 16 53 -1 80 -81 133 -192 126 -546 191 -817 148z M9610 3265 c-122 -20 -282 -70 -375 -118 -212 -111 -392 -294 -496 -507 -130 -266 -142 -590 -33 -869 136 -345 450 -595 825 -656 122 -19 305 -19 432 1 450 72 806 387 924 819 24 91 27 116 27 275 0 158 -3 185 -27 275 -77 291 -284 544 -553 679 -196 98 -485 138 -724 101z m286 -366 c218 -30 408 -169 507 -369 58 -119 79 -206 79 -336 0 -286 -158 -536 -417 -658 -109 -52 -195 -69 -328 -64 -140 6 -243 37 -348 106 -231 151 -348 406 -317 689 31 283 222 518 496 607 107 35 202 43 328 25z" />
        </g>
        <g fill="#fff">
          <path d="M5782 3335 c-177 -49 -314 -184 -363 -355 -7 -25 -15 -94 -18 -155 l-6 -110 -71 -6 c-86 -8 -111 -20 -130 -64 -20 -49 -18 -172 4 -215 23 -46 53 -60 135 -60 l67 0 0 -562 c0 -540 1 -564 20 -595 27 -44 74 -56 204 -51 104 3 107 4 139 36 l32 32 3 570 3 570 182 0 c164 0 185 2 215 20 44 27 54 59 50 167 -3 86 -5 95 -31 120 l-27 28 -195 3 -195 3 0 77 c0 106 26 156 100 195 62 31 84 33 174 12 98 -23 123 -10 172 92 67 138 52 185 -73 234 -75 29 -307 38 -391 14z M4650 3300 c-90 -42 -134 -109 -135 -205 -1 -183 213 -284 365 -174 100 73 113 232 26 327 -58 64 -178 88 -256 52z M2802 3247 c-59 -33 -55 30 -56 -1031 -1 -921 0 -972 17 -998 41 -60 21 -58 765 -58 l679 0 34 23 c48 32 62 80 56 192 -2 53 -10 100 -18 113 -32 52 -37 52 -598 52 l-521 0 0 826 0 826 -34 34 -34 34 -133 0 c-88 -1 -142 -5 -157 -13z M7055 2739 c-163 -19 -299 -72 -423 -164 -129 -97 -250 -285 -286 -445 -26 -112 -24 -302 3 -405 78 -297 301 -507 610 -576 121 -26 345 -26 457 1 120 28 204 63 294 120 97 63 120 90 120 141 0 34 -8 48 -57 102 -68 74 -86 86 -134 87 -27 0 -54 -12 -103 -46 -97 -66 -181 -95 -296 -101 -160 -9 -284 33 -385 128 -57 53 -100 131 -110 197 l-7 42 369 1 c202 0 456 0 564 -1 214 -2 236 3 278 56 17 22 21 41 21 110 0 364 -253 673 -605 739 -102 19 -219 24 -310 14z m297 -341 c109 -50 201 -162 214 -262 l7 -46 -411 0 c-226 0 -413 3 -415 8 -3 4 4 34 14 67 23 75 92 164 156 202 92 53 137 64 263 60 99 -3 123 -7 172 -29z M4603 2696 c-65 -29 -61 9 -65 -758 -2 -691 -2 -698 18 -725 33 -45 60 -53 177 -53 80 0 118 4 143 16 67 32 65 0 62 769 l-3 695 -33 32 -32 33 -118 3 c-85 2 -126 -2 -149 -12z" />
        </g>
      </g>
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
          <stop offset="1" stopColor="#37e779" />
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
        <circle cx="102" cy="41.3" r="6" fill="#37e779" />
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

/**
 * Campo de aurora a pantalla completa para el shell de la app (fijo, detrás
 * de todo): nebulosa lima que deriva + rejilla técnica tenue + viñeta.
 */
export function AuroraField({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('aurora-field pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-slate-50 dark:bg-ink-950', className)}>
      <div className="animate-blob absolute -left-40 -top-40 h-[42rem] w-[42rem] rounded-full bg-primary/[0.14] blur-[140px] dark:bg-primary/[0.16]" />
      <div className="animate-blob absolute -right-40 top-1/4 h-[38rem] w-[38rem] rounded-full bg-primary/[0.10] blur-[150px] [animation-delay:5s] dark:bg-primary/[0.12]" />
      <div className="animate-blob absolute -bottom-48 left-1/3 h-[40rem] w-[40rem] rounded-full bg-primary/[0.07] blur-[160px] [animation-delay:9s] dark:bg-primary/[0.08]" />
      <div className="absolute inset-0 opacity-[0.5] [background-image:linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] [background-size:72px_72px] dark:[background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,transparent_45%,rgba(0,0,0,0.06)_100%)] dark:bg-[radial-gradient(circle_at_50%_-10%,transparent_45%,rgba(0,0,0,0.5)_100%)]" />
    </div>
  );
}

/** Fondo ambiental de "aurora" — blobs difuminados que flotan. Va en un contenedor relativo. */
export function Ambient({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}>
      <div className="animate-blob absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
      <div className="animate-blob absolute -right-16 top-1/3 h-64 w-64 rounded-full bg-primary/15 blur-3xl [animation-delay:3s]" />
      <div className="animate-blob absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-primary/10 blur-3xl [animation-delay:6s]" />
    </div>
  );
}

/**
 * Fondo abstracto "seda" para las pantallas de auth: cintas fluidas en lima
 * sobre negro, con brillos difuminados y viñeta para enfocar el centro.
 */
export function AuthBackdrop({ className }: { className?: string }) {
  const id = useId();
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-ink-950', className)}>
      {/* Brillos que flotan */}
      <div className="animate-blob absolute -left-32 -top-24 h-[38rem] w-[38rem] rounded-full bg-primary/20 blur-[120px]" />
      <div className="animate-blob absolute -right-28 top-1/4 h-[34rem] w-[34rem] rounded-full bg-primary/15 blur-[120px] [animation-delay:4s]" />
      <div className="animate-blob absolute -bottom-32 left-1/3 h-[36rem] w-[36rem] rounded-full bg-primary/[0.12] blur-[130px] [animation-delay:8s]" />
      {/* Cintas de seda */}
      <svg
        className="absolute inset-0 h-full w-full opacity-70 [filter:blur(8px)]"
        viewBox="0 0 1200 1200"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1200" y2="1200" gradientUnits="userSpaceOnUse">
            <stop stopColor="rgb(var(--primary))" stopOpacity="0" />
            <stop offset="0.5" stopColor="rgb(var(--primary))" stopOpacity="0.55" />
            <stop offset="1" stopColor="rgb(var(--primary-400))" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${id}-b`} x1="1200" y1="0" x2="0" y2="1200" gradientUnits="userSpaceOnUse">
            <stop stopColor="rgb(var(--primary-200))" stopOpacity="0" />
            <stop offset="0.5" stopColor="rgb(var(--primary))" stopOpacity="0.4" />
            <stop offset="1" stopColor="rgb(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M-120 340 C 220 140 420 560 700 400 S 1160 240 1320 540" fill="none" stroke={`url(#${id}-a)`} strokeWidth="150" strokeLinecap="round" />
        <path d="M-120 780 C 180 640 400 960 660 800 S 1120 680 1320 860" fill="none" stroke={`url(#${id}-b)`} strokeWidth="130" strokeLinecap="round" />
        <path d="M-120 560 C 260 460 460 720 760 600 S 1180 480 1320 700" fill="none" stroke={`url(#${id}-a)`} strokeWidth="60" strokeLinecap="round" opacity="0.6" />
      </svg>
      {/* Viñeta */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.7)_100%)]" />
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
          className="font-display text-6xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_30px_rgb(var(--primary)/0.45)] sm:text-8xl"
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
 * Marca de la IA: una chispa-aurora en gradiente con el acento elegido.
 * Transparente, va inline.
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
          <stop stopColor="rgb(var(--primary-200))" />
          <stop offset="0.5" stopColor="rgb(var(--primary))" />
          <stop offset="1" stopColor="rgb(var(--primary-600))" />
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
