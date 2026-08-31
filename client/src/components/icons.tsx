import {
  Flame,
  Dumbbell,
  BookOpen,
  Flower2,
  Droplet,
  Apple,
  Footprints,
  PenLine,
  Target,
  Moon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../lib/utils';

/* ─── Habit icons ─────────────────────────────────────────────────────
   Habits store an icon *key* (not an emoji). Render it as a lucide SVG. */
export const HABIT_ICON_MAP: Record<string, LucideIcon> = {
  flame: Flame,
  dumbbell: Dumbbell,
  book: BookOpen,
  meditation: Flower2,
  water: Droplet,
  apple: Apple,
  run: Footprints,
  write: PenLine,
  target: Target,
  sleep: Moon,
};

export const HABIT_ICON_KEYS = Object.keys(HABIT_ICON_MAP);

export function HabitIcon({
  name,
  className,
  style,
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = HABIT_ICON_MAP[name] ?? Flame;
  return <Icon className={className} style={style} />;
}

/* ─── Mood faces (1–5) ───────────────────────────────────────────────────
   Cara propia de "Life OS" (círculo + rasgos) en vez de íconos genéricos de
   Lucide, para que el diario tenga más carácter. Cada rasgo es un path a
   mano en un viewBox de 36×36. */
interface MoodFaceSpec {
  brows?: React.ReactNode;
  eyes: React.ReactNode;
  mouth: React.ReactNode;
  blush?: boolean;
}

const MOOD_FACE_SPECS: Record<number, MoodFaceSpec> = {
  1: {
    // Fatal: cejas fruncidas en V, boca muy caída.
    brows: (
      <>
        <path d="M9.5 14.5 15 17" />
        <path d="M26.5 14.5 21 17" />
      </>
    ),
    eyes: (
      <>
        <circle cx="13.5" cy="20" r="1.7" fill="currentColor" stroke="none" />
        <circle cx="22.5" cy="20" r="1.7" fill="currentColor" stroke="none" />
      </>
    ),
    mouth: <path d="M12 28c2.3-3.4 9.7-3.4 12 0" />,
  },
  2: {
    // Mal: cejas rectas, boca apenas caída.
    brows: (
      <>
        <path d="M10 15h6" />
        <path d="M20 15h6" />
      </>
    ),
    eyes: (
      <>
        <circle cx="13.5" cy="18.5" r="1.7" fill="currentColor" stroke="none" />
        <circle cx="22.5" cy="18.5" r="1.7" fill="currentColor" stroke="none" />
      </>
    ),
    mouth: <path d="M13 26.5c1.8-2 8.2-2 10 0" />,
  },
  3: {
    // Regular: boca recta.
    eyes: (
      <>
        <circle cx="13.5" cy="17.5" r="1.7" fill="currentColor" stroke="none" />
        <circle cx="22.5" cy="17.5" r="1.7" fill="currentColor" stroke="none" />
      </>
    ),
    mouth: <path d="M13 25.5h10" />,
  },
  4: {
    // Bien: sonrisa suave + mejillas.
    eyes: (
      <>
        <circle cx="13.5" cy="17.5" r="1.7" fill="currentColor" stroke="none" />
        <circle cx="22.5" cy="17.5" r="1.7" fill="currentColor" stroke="none" />
      </>
    ),
    mouth: <path d="M12 23.5c2.3 3.6 9.7 3.6 12 0" />,
    blush: true,
  },
  5: {
    // Genial: ojos felices cerrados (arcos) + sonrisa grande + mejillas.
    eyes: (
      <>
        <path d="M10 17.5c1.1-1.7 4.4-1.7 5.5 0" />
        <path d="M20.5 17.5c1.1-1.7 4.4-1.7 5.5 0" />
      </>
    ),
    mouth: <path d="M10.5 22c2.8 5 12.2 5 15 0" fill="currentColor" fillOpacity="0.18" />,
    blush: true,
  },
};

export const MOOD_LABELS = ['', 'Fatal', 'Mal', 'Regular', 'Bien', 'Genial'];

export function MoodFace({
  mood,
  className,
  style,
  animate,
}: {
  mood: number;
  className?: string;
  style?: React.CSSProperties;
  /** Reproduce el "squish" de aparición (usar solo justo al elegir el ánimo). */
  animate?: boolean;
}) {
  const spec = MOOD_FACE_SPECS[mood] ?? MOOD_FACE_SPECS[3];
  return (
    <svg
      viewBox="0 0 36 36"
      className={cn('h-6 w-6', animate && 'mood-face-pop', className)}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="18" r="16" fill="currentColor" fillOpacity="0.12" stroke="none" />
      {spec.brows}
      {spec.eyes}
      {spec.blush && (
        <>
          <circle cx="8.5" cy="21.5" r="2.2" fill="currentColor" fillOpacity="0.25" stroke="none" />
          <circle cx="27.5" cy="21.5" r="2.2" fill="currentColor" fillOpacity="0.25" stroke="none" />
        </>
      )}
      {spec.mouth}
    </svg>
  );
}
