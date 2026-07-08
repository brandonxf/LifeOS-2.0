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
  Angry,
  Frown,
  Meh,
  Smile,
  Laugh,
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

/* ─── Mood faces (1–5) ───────────────────────────────────────────────── */
const MOOD_ICON: Record<number, LucideIcon> = {
  1: Angry,
  2: Frown,
  3: Meh,
  4: Smile,
  5: Laugh,
};
export const MOOD_LABELS = ['', 'Fatal', 'Mal', 'Regular', 'Bien', 'Genial'];

export function MoodFace({
  mood,
  className,
  style,
}: {
  mood: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = MOOD_ICON[mood] ?? Meh;
  return <Icon className={cn('h-6 w-6', className)} style={style} />;
}
