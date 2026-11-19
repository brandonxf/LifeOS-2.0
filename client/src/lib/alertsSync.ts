import type { QueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { api } from './api';
import { bogotaISODate } from './date';
import { currentStreak } from './streak';
import { formatCurrency } from './utils';
import { hasNotificationPermission } from './notifications';
import { useSettings } from '../store/settings';
import { useAuth } from '../store/auth';
import type { CalendarEvent, FinanceBudget, FinanceEntry, Habit } from './types';

/**
 * Alertas "inteligentes": a diferencia del recordatorio diario fijo, su
 * contenido depende de los datos (eventos próximos, gasto vs. presupuesto,
 * rachas), así que se recalculan al abrir la app, al volver a ella y cuando
 * cambian los datos relevantes.
 */

const native = Capacitor.isNativePlatform();

const EVENT_LOOKAHEAD_DAYS = 7;
const STREAK_ID = 900000002;
const BUDGET_STORAGE_KEY = 'life-os-budget-alerts';
// Las queries de este módulo usan una key propia para no re-dispararse a sí
// mismo al escribir en el cache.
const OWN_EVENTS_KEY = ['events', 'reminders'];
const WATCHED_KEYS = new Set(['events', 'habits', 'finance']);

/** Id numérico estable (LocalNotifications no acepta strings). Rango propio
 *  por encima de los ids de tareas para no chocar. */
function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return 1000000000 + (Math.abs(h) % 800000000);
}

async function cancelPendingByKind(kind: string) {
  const { notifications } = await LocalNotifications.getPending();
  const mine = notifications.filter((n) => (n.extra as { kind?: string } | undefined)?.kind === kind);
  if (mine.length) await LocalNotifications.cancel({ notifications: mine.map((n) => ({ id: n.id })) });
}

function atToday(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

// ── Eventos del calendario ────────────────────────────────────────────────
async function syncEventReminders(qc: QueryClient) {
  await cancelPendingByKind('event');
  const { eventReminderEnabled, eventReminderMinutes } = useSettings.getState();
  if (!eventReminderEnabled) return;

  const now = new Date();
  const end = new Date(now.getTime() + EVENT_LOOKAHEAD_DAYS * 86400000);
  const events = await qc.fetchQuery({
    queryKey: OWN_EVENTS_KEY,
    queryFn: () =>
      api<CalendarEvent[]>('/api/calendar/events', {
        query: { start: now.toISOString(), end: end.toISOString() },
      }),
    staleTime: 30_000,
  });

  const notifications = events
    .filter((e) => !e.allDay)
    .map((e) => ({ e, at: new Date(new Date(e.startTime).getTime() - eventReminderMinutes * 60000) }))
    .filter(({ at }) => at.getTime() > Date.now())
    .slice(0, 50) // Android limita las alarmas pendientes por app
    .map(({ e, at }) => ({
      id: hashId(`event:${e.id}`),
      title: e.title,
      body:
        eventReminderMinutes >= 60 && eventReminderMinutes % 60 === 0
          ? `Empieza en ${eventReminderMinutes / 60} h${e.location ? ` · ${e.location}` : ''}`
          : `Empieza en ${eventReminderMinutes} min${e.location ? ` · ${e.location}` : ''}`,
      schedule: { at, allowWhileIdle: true },
      extra: { kind: 'event' },
    }));
  if (notifications.length) await LocalNotifications.schedule({ notifications });
}

// ── Racha en riesgo ───────────────────────────────────────────────────────
async function syncStreakAlert(qc: QueryClient) {
  await LocalNotifications.cancel({ notifications: [{ id: STREAK_ID }] });
  const { streakAlertEnabled, streakAlertTime } = useSettings.getState();
  if (!streakAlertEnabled) return;

  const at = atToday(streakAlertTime);
  if (at.getTime() <= Date.now()) return; // ya pasó la hora de hoy

  const habits = await qc.fetchQuery({
    queryKey: ['habits'],
    queryFn: () => api<Habit[]>('/api/habits'),
    staleTime: 30_000,
  });
  const today = bogotaISODate();
  const atRisk = habits
    .filter((h) => !h.logs.includes(today))
    .map((h) => ({ name: h.name, streak: currentStreak(h.logs) }))
    .filter((h) => h.streak > 0)
    .sort((a, b) => b.streak - a.streak);
  if (!atRisk.length) return;

  const top = atRisk[0];
  const body =
    atRisk.length === 1
      ? `Tu racha de ${top.streak} ${top.streak === 1 ? 'día' : 'días'} en "${top.name}" se pierde hoy. ¡Aún estás a tiempo!`
      : `${atRisk.length} rachas en riesgo hoy, empezando por "${top.name}" (${top.streak} días).`;

  await LocalNotifications.schedule({
    notifications: [
      { id: STREAK_ID, title: '🔥 Tu racha está en riesgo', body, schedule: { at, allowWhileIdle: true } },
    ],
  });
}

// ── Presupuestos ──────────────────────────────────────────────────────────
function readNotified(): Record<string, true> {
  try {
    return JSON.parse(localStorage.getItem(BUDGET_STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

async function syncBudgetAlerts(qc: QueryClient) {
  if (!useSettings.getState().budgetAlertEnabled) return;

  const [budgets, entries] = await Promise.all([
    qc.fetchQuery({
      queryKey: ['finance', 'budgets'],
      queryFn: () => api<FinanceBudget[]>('/api/finance/budgets'),
      staleTime: 30_000,
    }),
    // Misma key que usa la pantalla de Finanzas (comparte caché).
    qc.fetchQuery({
      queryKey: ['finance', 'entries', '', '', '', ''],
      queryFn: () => api<FinanceEntry[]>('/api/finance/entries'),
      staleTime: 30_000,
    }),
  ]);

  // Mismo cálculo que la tarjeta "Seguimiento de presupuestos" de Finanzas,
  // para que el aviso y lo que se ve en pantalla siempre coincidan.
  const spent: Record<string, number> = {};
  for (const e of entries) {
    if (e.type === 'expense') spent[e.category] = (spent[e.category] ?? 0) + Number(e.amount);
  }

  const notified = readNotified();
  const month = bogotaISODate().slice(0, 7);
  const toSend: { id: number; title: string; body: string }[] = [];

  for (const b of budgets) {
    const limit = Number(b.limit);
    if (!limit) continue;
    const used = spent[b.category] ?? 0;
    const pct = (used / limit) * 100;
    const level = pct >= 100 ? 100 : pct >= 80 ? 80 : 0;
    if (!level) continue;
    const key = `${b.id}:${month}:${level}`;
    if (notified[key]) continue;
    notified[key] = true;
    toSend.push({
      id: hashId(`budget:${key}`),
      title: level === 100 ? `Superaste tu presupuesto de ${b.category}` : `Vas al 80% de ${b.category}`,
      body: `Has gastado ${formatCurrency(used)} de ${formatCurrency(limit)}.`,
    });
  }
  if (!toSend.length) return;

  // Se guarda lo notificado de este mes solamente, para que no crezca sin fin.
  const pruned = Object.fromEntries(Object.entries(notified).filter(([k]) => k.split(':')[1] === month));
  try {
    localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    /* sin almacenamiento: puede repetir el aviso, no es grave */
  }
  const at = new Date(Date.now() + 1500);
  await LocalNotifications.schedule({
    notifications: toSend.map((n) => ({ ...n, schedule: { at } })),
  });
}

// ── Orquestación ──────────────────────────────────────────────────────────
let running = false;
let rerun = false;

/** Recalcula todas las alertas. Seguro de llamar muchas veces. */
export async function syncAlerts(qc: QueryClient) {
  if (!native || !useAuth.getState().accessToken) return;
  if (running) {
    rerun = true;
    return;
  }
  running = true;
  try {
    if (!(await hasNotificationPermission())) return;
    // Cada bloque falla por separado (p. ej. sin conexión no debe impedir
    // que se programe el resto).
    await Promise.allSettled([syncEventReminders(qc), syncStreakAlert(qc), syncBudgetAlerts(qc)]);
  } finally {
    running = false;
    if (rerun) {
      rerun = false;
      void syncAlerts(qc);
    }
  }
}

let started = false;
let timer: ReturnType<typeof setTimeout> | null = null;

function schedule(qc: QueryClient) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void syncAlerts(qc);
  }, 1500);
}

export function initAlertsSync(qc: QueryClient) {
  if (started || !native) return;
  started = true;

  qc.getQueryCache().subscribe((event) => {
    const key = event.query.queryKey;
    if (key[0] === OWN_EVENTS_KEY[0] && key[1] === OWN_EVENTS_KEY[1]) return;
    if (typeof key[0] === 'string' && WATCHED_KEYS.has(key[0])) schedule(qc);
  });

  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) schedule(qc);
  });
  // Cambios en ajustes (activar/desactivar, horas) o sesión iniciada.
  useSettings.subscribe(() => schedule(qc));
  useAuth.subscribe((s, prev) => {
    if (s.accessToken && !prev.accessToken) schedule(qc);
  });

  schedule(qc);
}
