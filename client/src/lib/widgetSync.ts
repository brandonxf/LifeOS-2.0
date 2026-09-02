import type { QueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { updateHomeWidget, consumeWidgetRefreshFlag, finishWidgetRefresh } from './widget';
import { currentStreak } from './streak';
import { bogotaISODate } from './date';
import { formatCurrency } from './utils';
import type { Task, Habit, FinanceSummary, Note } from './types';

// Claves de query que alimentan el widget: cualquier cambio en tareas,
// hábitos, el resumen de finanzas o las notas (en CUALQUIER pantalla, no
// solo el Dashboard/Notas) dispara una sincronización.
const WATCHED_KEYS = new Set(['tasks', 'habits', 'finance', 'notes']);

/** Texto plano y corto para el widget: quita sintaxis Markdown básica y
 *  colapsa saltos de línea/espacios en uno solo. */
function noteSnippet(content: string): string {
  const plain = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 60 ? `${plain.slice(0, 60)}…` : plain;
}

let started = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let refreshLaunchPending = false;

function nextTaskLabel(tasks: Task[]): string {
  const active = tasks.filter((t) => t.status !== 'done');
  if (!active.length) return '¡No tienes tareas pendientes!';

  const withDue = active
    .filter((t): t is Task & { dueDate: string } => !!t.dueDate)
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));

  if (!withDue.length) return `Próximo: ${active[0].title}`;

  const t = withDue[0];
  const due = parseISO(t.dueDate);
  const when = isToday(due) ? 'hoy' : isPast(due) ? 'venció' : format(due, "d 'de' MMM");
  return `Próximo: ${t.title} (${when})`;
}

async function pushSnapshot(queryClient: QueryClient) {
  const tasks = queryClient.getQueryData<Task[]>(['tasks']);
  const habits = queryClient.getQueryData<Habit[]>(['habits']);
  if (!tasks || !habits) return; // aún no hay datos suficientes para pintar el widget

  const finance = queryClient.getQueryData<FinanceSummary>(['finance', 'summary']);
  const notesData = queryClient.getQueryData<Note[]>(['notes']) ?? [];
  const notes = [...notesData]
    .sort((a, b) => (a.pinned === b.pinned ? (a.updatedAt < b.updatedAt ? 1 : -1) : a.pinned ? -1 : 1))
    .slice(0, 3)
    .map((n) => ({ title: n.title || 'Sin título', snippet: noteSnippet(n.content), color: n.color }));

  const pendingTasks = tasks.filter((t) => t.status !== 'done').length;
  const today = bogotaISODate();
  const habitsDone = habits.filter((h) => h.logs.includes(today)).length;
  const streaks = habits.map((h) => currentStreak(h.logs));
  const bestStreak = streaks.reduce((max, s) => Math.max(max, s), 0);
  const activeStreakHabits = streaks.filter((s) => s > 0).length;
  const balance = finance?.balance ?? 0;

  await updateHomeWidget({
    pendingTasks,
    habitsDone,
    habitsTotal: habits.length,
    bestStreak,
    activeStreakHabits,
    nextTaskText: nextTaskLabel(tasks),
    balanceText: formatCurrency(balance),
    balancePositive: balance >= 0,
    notes,
  });

  // Si esta apertura de la app fue por el botón "recargar" del widget, ya
  // sincronizamos con datos frescos: manda la app de vuelta al home screen.
  if (refreshLaunchPending) {
    refreshLaunchPending = false;
    finishWidgetRefresh();
  }
}

function schedulePush(queryClient: QueryClient) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    pushSnapshot(queryClient);
  }, 400);
}

/** Arranca la sincronización del widget: escucha CUALQUIER cambio en el
 *  cache de tareas/hábitos/finanzas (venga de la pantalla que venga) y
 *  empuja un snapshot nuevo al widget con un pequeño debounce. Se llama
 *  una sola vez al iniciar la app (ver main.tsx). */
export function initWidgetSync(queryClient: QueryClient) {
  if (started || !Capacitor.isNativePlatform()) return;
  started = true;

  consumeWidgetRefreshFlag().then((isRefresh) => {
    refreshLaunchPending = isRefresh;
  });

  queryClient.getQueryCache().subscribe((event) => {
    const rootKey = event.query.queryKey[0];
    if (typeof rootKey === 'string' && WATCHED_KEYS.has(rootKey)) {
      schedulePush(queryClient);
    }
  });

  // Primer intento por si los datos ya estaban en cache (p. ej. tras un
  // refresh en caliente); si no hay nada aún, pushSnapshot se sale solo.
  schedulePush(queryClient);
}
