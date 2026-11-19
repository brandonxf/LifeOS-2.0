import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  tasks,
  habits,
  financeEntries,
  financeBudgets,
  financeRecurring,
  calendarEvents,
  goals,
  goalMilestones,
  notes,
} from '../db/schema/index.js';
import { embed } from './embedding.service.js';
import { bogotaISODate } from '../lib/date.js';

/**
 * Acciones "avanzadas" del asistente: editar y borrar en todos los módulos,
 * más presupuestos, recurrentes e hitos de metas. Las crea/ejecuta
 * `executeOne` en ai.service.ts, que delega aquí los tipos que no maneja.
 *
 * Todo se busca por nombre (`match`) entre los elementos del PROPIO usuario;
 * si hay 0 o varias coincidencias se devuelve un error legible en lugar de
 * adivinar. Los borrados son "soft delete" (deletedAt), como en la app.
 */

export interface ActionResult {
  ok: boolean;
  kind: 'task' | 'finance' | 'event' | 'habit' | 'goal' | 'note' | 'diary' | 'unknown';
  label: string;
  error?: string;
}

export const stripAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HM = /^\d{2}:\d{2}$/;

/** Colombia es UTC-5 fijo: así "15:00" significa 3pm hora Colombia aunque el
 *  servidor (Vercel) corra en UTC. */
export function bogotaDateTime(date: string, hm: string): Date {
  return new Date(`${date}T${hm}:00-05:00`);
}
const bogotaParts = (d: Date) => {
  const iso = new Date(d.getTime() - 5 * 3600_000).toISOString();
  return { date: iso.slice(0, 10), hm: iso.slice(11, 16) };
};

/** Búsqueda por texto aproximado: exacta primero, luego "contiene". Devuelve
 *  el único candidato, o un error legible si no hay o hay varios. */
export function pickOne<T>(
  rows: T[],
  title: (r: T) => string,
  query: unknown,
  noun: string,
): { row: T } | { error: string } {
  const q = stripAccents(String(query ?? '')).trim();
  if (!q) return { error: `falta indicar qué ${noun}` };
  const norm = rows.map((r) => ({ r, t: stripAccents(title(r)) }));
  const exact = norm.filter((x) => x.t === q);
  const hits = exact.length ? exact : norm.filter((x) => x.t.includes(q) || (x.t.length > 3 && q.includes(x.t)));
  if (hits.length === 1) return { row: hits[0].r };
  if (!hits.length) return { error: `no encontré ${noun} "${query}"` };
  return { error: `hay varias coincidencias: ${hits.slice(0, 4).map((x) => `"${title(x.r)}"`).join(', ')}` };
}

const fail = (kind: ActionResult['kind'], label: string, error: string): ActionResult => ({ ok: false, kind, label, error });
const str = (v: unknown) => (v === undefined || v === null ? undefined : String(v));
const pos = (v: unknown) => (Number(v) > 0 ? Number(v) : undefined);

type Found<T> = { row: T } | { error: string };

// ── Búsquedas por entidad (siempre del propio usuario, sin borrados) ───────
const findTask = async (u: string, q: unknown): Promise<Found<typeof tasks.$inferSelect>> =>
  pickOne(await db.select().from(tasks).where(and(eq(tasks.userId, u), isNull(tasks.deletedAt))), (t) => t.title, q, 'tarea');
const findEvent = async (u: string, q: unknown) =>
  pickOne(
    await db.select().from(calendarEvents).where(and(eq(calendarEvents.userId, u), isNull(calendarEvents.deletedAt))),
    (e) => e.title, q, 'evento',
  );
const findHabit = async (u: string, q: unknown) =>
  pickOne(await db.select().from(habits).where(and(eq(habits.userId, u), isNull(habits.deletedAt))), (h) => h.name, q, 'hábito');
const findGoal = async (u: string, q: unknown) =>
  pickOne(await db.select().from(goals).where(and(eq(goals.userId, u), isNull(goals.deletedAt))), (g) => g.title, q, 'meta');
const findNote = async (u: string, q: unknown) =>
  pickOne(await db.select().from(notes).where(and(eq(notes.userId, u), isNull(notes.deletedAt))), (n) => n.title ?? '', q, 'nota');
const findBudget = async (u: string, q: unknown) =>
  pickOne(
    await db.select().from(financeBudgets).where(and(eq(financeBudgets.userId, u), isNull(financeBudgets.deletedAt))),
    (b) => b.category, q, 'presupuesto',
  );
const findRecurring = async (u: string, q: unknown) =>
  pickOne(
    await db.select().from(financeRecurring).where(and(eq(financeRecurring.userId, u), isNull(financeRecurring.deletedAt))),
    (r) => `${r.description ?? ''} ${r.category}`.trim(), q, 'recurrente',
  );

/** Movimiento de finanzas: se busca por texto en descripción/categoría y se
 *  afina con `amount` y/o `date` (para distinguir entre movimientos parecidos). */
async function findEntry(u: string, p: any): Promise<Found<typeof financeEntries.$inferSelect>> {
  let rows = await db
    .select()
    .from(financeEntries)
    .where(and(eq(financeEntries.userId, u), isNull(financeEntries.deletedAt)))
    .orderBy(desc(financeEntries.date))
    .limit(300);
  if (pos(p.amount ?? p.matchAmount)) rows = rows.filter((r) => Number(r.amount) === Number(p.amount ?? p.matchAmount));
  if (ISO_DATE.test(p.matchDate ?? '')) rows = rows.filter((r) => r.date === p.matchDate);
  const label = (r: (typeof rows)[number]) =>
    `${r.description ? `${r.description} · ` : ''}${r.category} ($${Number(r.amount)}, ${r.date})`;
  const q = stripAccents(String(p.match ?? '')).trim();
  const hits = rows.filter((r) => stripAccents(`${r.description ?? ''} ${r.category}`).includes(q));
  if (hits.length === 1) return { row: hits[0] };
  if (!hits.length) return { error: `no encontré un movimiento "${p.match}"` };
  return { error: `hay varios movimientos parecidos: ${hits.slice(0, 4).map((r) => `"${label(r)}"`).join('; ')}. Indica el monto o la fecha` };
}

// ── Soft delete genérico ───────────────────────────────────────────────────
async function softDelete(table: any, id: string, userId: string) {
  await db.update(table).set({ deletedAt: new Date() }).where(and(eq(table.id, id), eq(table.userId, userId)));
}

/** Ejecuta una acción avanzada. Devuelve null si el tipo no es de este módulo. */
export async function executeAdvanced(userId: string, p: any, canDelete: boolean): Promise<ActionResult | null> {
  const type = String(p?.type ?? '');

  // Todos los borrados exigen que el usuario lo haya pedido explícitamente.
  if (type.startsWith('delete_') && !canDelete) {
    return fail('unknown', 'borrado', 'para borrar, pídelo explícitamente (ej. "borra la tarea X")');
  }

  switch (type) {
    // ── Crear (módulos que faltaban) ─────────────────────────────────────
    case 'create_budget': {
      if (!p.category) return fail('finance', 'presupuesto', 'falta la categoría');
      const limit = pos(p.limit);
      if (!limit) return fail('finance', 'presupuesto', 'falta el límite');
      const period = ['monthly', 'weekly', 'yearly'].includes(p.period) ? p.period : 'monthly';
      await db.insert(financeBudgets).values({ userId, category: String(p.category), limit: limit.toFixed(2), period });
      return { ok: true, kind: 'finance', label: `Presupuesto de ${p.category}: $${limit}` };
    }
    case 'create_recurring': {
      const amount = pos(p.amount);
      if (!amount) return fail('finance', 'recurrente', 'monto inválido');
      if (!p.category) return fail('finance', 'recurrente', 'falta la categoría');
      if (!['weekly', 'monthly', 'yearly'].includes(p.frequency)) return fail('finance', 'recurrente', 'falta la frecuencia (semanal, mensual o anual)');
      await db.insert(financeRecurring).values({
        userId,
        type: p.entryType === 'income' ? 'income' : 'expense',
        amount: amount.toFixed(2),
        category: String(p.category),
        description: str(p.description) ?? null,
        frequency: p.frequency,
        startDate: ISO_DATE.test(p.startDate ?? '') ? p.startDate : bogotaISODate(),
        endDate: ISO_DATE.test(p.endDate ?? '') ? p.endDate : null,
      });
      return { ok: true, kind: 'finance', label: `Recurrente: ${p.category} $${amount} (${p.frequency})` };
    }
    case 'add_milestone': {
      const g = await findGoal(userId, p.match);
      if ('error' in g) return fail('goal', 'hito', g.error);
      if (!p.title) return fail('goal', 'hito', 'falta el título del hito');
      await db.insert(goalMilestones).values({ goalId: g.row.id, userId, title: String(p.title) });
      return { ok: true, kind: 'goal', label: `Hito en "${g.row.title}": ${p.title}` };
    }
    case 'complete_milestone': {
      const g = await findGoal(userId, p.match);
      if ('error' in g) return fail('goal', 'hito', g.error);
      const ms = await db
        .select()
        .from(goalMilestones)
        .where(and(eq(goalMilestones.goalId, g.row.id), eq(goalMilestones.userId, userId)));
      const m = pickOne(ms, (x) => x.title, p.milestone, 'hito');
      if ('error' in m) return fail('goal', 'hito', m.error);
      const done = p.done !== false;
      await db.update(goalMilestones).set({ done }).where(eq(goalMilestones.id, m.row.id));
      return { ok: true, kind: 'goal', label: `Hito ${done ? 'completado' : 'reabierto'}: ${m.row.title}` };
    }

    // ── Editar ───────────────────────────────────────────────────────────
    case 'update_event': {
      const f = await findEvent(userId, p.match);
      if ('error' in f) return fail('event', 'evento', f.error);
      const e = f.row;
      const cur = bogotaParts(e.startTime);
      const date = ISO_DATE.test(p.date ?? '') ? p.date : cur.date;
      const allDay = p.allDay === undefined ? e.allDay : Boolean(p.allDay);
      const patch: Partial<typeof calendarEvents.$inferInsert> = { allDay };
      if (allDay) {
        patch.startTime = bogotaDateTime(date, '00:00');
        patch.endTime = bogotaDateTime(date, '23:59');
      } else {
        const startHM = HM.test(p.startTime ?? '') ? p.startTime : cur.hm;
        patch.startTime = bogotaDateTime(date, startHM);
        patch.endTime = HM.test(p.endTime ?? '')
          ? bogotaDateTime(date, p.endTime)
          : new Date(patch.startTime.getTime() + (e.endTime.getTime() - e.startTime.getTime()));
      }
      const newTitle = str(p.title);
      if (newTitle) patch.title = newTitle;
      if (p.location !== undefined) patch.location = str(p.location) ?? null;
      if (p.description !== undefined) patch.description = str(p.description) ?? null;
      if (typeof p.color === 'string') patch.color = p.color;
      await db.update(calendarEvents).set(patch).where(and(eq(calendarEvents.id, e.id), eq(calendarEvents.userId, userId)));
      return { ok: true, kind: 'event', label: `Evento actualizado: ${newTitle ?? e.title}` };
    }
    case 'update_habit': {
      const f = await findHabit(userId, p.match);
      if ('error' in f) return fail('habit', 'hábito', f.error);
      const patch: Partial<typeof habits.$inferInsert> = {};
      if (str(p.name)) patch.name = String(p.name);
      if (p.description !== undefined) patch.description = str(p.description) ?? null;
      if (['daily', 'weekly'].includes(p.frequency)) patch.frequency = p.frequency;
      const t = Number(p.targetPerWeek);
      if (Number.isInteger(t) && t >= 1 && t <= 7) patch.targetPerWeek = t;
      if (typeof p.color === 'string') patch.color = p.color;
      if (!Object.keys(patch).length) return fail('habit', f.row.name, 'no indicaste qué cambiar');
      await db.update(habits).set(patch).where(and(eq(habits.id, f.row.id), eq(habits.userId, userId)));
      return { ok: true, kind: 'habit', label: `Hábito actualizado: ${patch.name ?? f.row.name}` };
    }
    case 'update_goal': {
      const f = await findGoal(userId, p.match);
      if ('error' in f) return fail('goal', 'meta', f.error);
      const g = f.row;
      const patch: Partial<typeof goals.$inferInsert> = {};
      if (str(p.title)) patch.title = String(p.title);
      if (p.description !== undefined) patch.description = str(p.description) ?? null;
      if (str(p.category)) patch.category = String(p.category);
      if (str(p.unit)) patch.unit = String(p.unit);
      if (pos(p.targetValue)) patch.targetValue = String(Number(p.targetValue));
      if (p.deadline === null || ISO_DATE.test(p.deadline ?? '')) patch.deadline = p.deadline;
      if (['active', 'completed', 'archived'].includes(p.status)) patch.status = p.status;

      let next: number | undefined;
      if (p.currentValue !== undefined && Number(p.currentValue) >= 0) next = Number(p.currentValue);
      else if (p.addValue !== undefined && Number.isFinite(Number(p.addValue))) next = Math.max(0, Number(g.currentValue) + Number(p.addValue));
      if (next !== undefined) {
        patch.currentValue = next.toString();
        const target = Number(patch.targetValue ?? g.targetValue);
        if (!patch.status) patch.status = next >= target ? 'completed' : g.status === 'completed' ? 'active' : g.status;
      }
      if (!Object.keys(patch).length) return fail('goal', g.title, 'no indicaste qué cambiar');
      await db.update(goals).set(patch).where(and(eq(goals.id, g.id), eq(goals.userId, userId)));
      const shown = next !== undefined ? ` (${next}/${Number(patch.targetValue ?? g.targetValue)} ${patch.unit ?? g.unit ?? ''})`.trimEnd() : '';
      return { ok: true, kind: 'goal', label: `Meta ${patch.status === 'completed' ? 'completada' : 'actualizada'}: ${patch.title ?? g.title}${shown}` };
    }
    case 'update_note': {
      const f = await findNote(userId, p.match);
      if ('error' in f) return fail('note', 'nota', f.error);
      const n = f.row;
      const title = str(p.title) ?? n.title ?? 'Sin título';
      let content = n.content ?? '';
      if (p.content !== undefined) content = String(p.content);
      if (str(p.append)) content = `${content}${content ? '\n' : ''}${p.append}`;
      const patch: Partial<typeof notes.$inferInsert> = { title, content, embedding: embed(`${title}\n${content}`) };
      if (Array.isArray(p.tags)) patch.tags = p.tags.map(String);
      if (p.pinned !== undefined) patch.pinned = Boolean(p.pinned);
      if (typeof p.color === 'string') patch.color = p.color;
      await db.update(notes).set(patch).where(and(eq(notes.id, n.id), eq(notes.userId, userId)));
      return { ok: true, kind: 'note', label: `Nota actualizada: ${title}` };
    }
    case 'update_finance_entry': {
      const f = await findEntry(userId, p);
      if ('error' in f) return fail('finance', 'movimiento', f.error);
      const patch: Partial<typeof financeEntries.$inferInsert> = {};
      if (pos(p.newAmount)) patch.amount = Number(p.newAmount).toFixed(2);
      if (str(p.category)) patch.category = String(p.category);
      if (p.description !== undefined) patch.description = str(p.description) ?? null;
      if (ISO_DATE.test(p.date ?? '')) patch.date = p.date;
      if (['income', 'expense'].includes(p.entryType)) patch.type = p.entryType;
      if (!Object.keys(patch).length) return fail('finance', 'movimiento', 'no indicaste qué cambiar');
      await db.update(financeEntries).set(patch).where(and(eq(financeEntries.id, f.row.id), eq(financeEntries.userId, userId)));
      return { ok: true, kind: 'finance', label: `Movimiento actualizado: ${f.row.description ?? f.row.category}` };
    }
    case 'update_budget': {
      const f = await findBudget(userId, p.match);
      if ('error' in f) return fail('finance', 'presupuesto', f.error);
      const patch: Partial<typeof financeBudgets.$inferInsert> = {};
      if (pos(p.limit)) patch.limit = Number(p.limit).toFixed(2);
      if (['monthly', 'weekly', 'yearly'].includes(p.period)) patch.period = p.period;
      if (str(p.category)) patch.category = String(p.category);
      if (!Object.keys(patch).length) return fail('finance', f.row.category, 'no indicaste qué cambiar');
      await db.update(financeBudgets).set(patch).where(and(eq(financeBudgets.id, f.row.id), eq(financeBudgets.userId, userId)));
      return { ok: true, kind: 'finance', label: `Presupuesto actualizado: ${patch.category ?? f.row.category}` };
    }
    case 'update_recurring': {
      const f = await findRecurring(userId, p.match);
      if ('error' in f) return fail('finance', 'recurrente', f.error);
      const patch: Partial<typeof financeRecurring.$inferInsert> = {};
      if (pos(p.newAmount)) patch.amount = Number(p.newAmount).toFixed(2);
      if (str(p.category)) patch.category = String(p.category);
      if (p.description !== undefined) patch.description = str(p.description) ?? null;
      if (['weekly', 'monthly', 'yearly'].includes(p.frequency)) patch.frequency = p.frequency;
      if (p.endDate === null || ISO_DATE.test(p.endDate ?? '')) patch.endDate = p.endDate;
      if (p.active !== undefined) patch.active = Boolean(p.active);
      if (!Object.keys(patch).length) return fail('finance', f.row.category, 'no indicaste qué cambiar');
      await db.update(financeRecurring).set(patch).where(and(eq(financeRecurring.id, f.row.id), eq(financeRecurring.userId, userId)));
      return { ok: true, kind: 'finance', label: `Recurrente actualizado: ${f.row.description ?? f.row.category}` };
    }

    // ── Borrar (soft delete) ─────────────────────────────────────────────
    case 'delete_task': {
      const f = await findTask(userId, p.match);
      if ('error' in f) return fail('task', 'tarea', f.error);
      await softDelete(tasks, f.row.id, userId);
      return { ok: true, kind: 'task', label: `Tarea eliminada: ${f.row.title}` };
    }
    case 'delete_event': {
      const f = await findEvent(userId, p.match);
      if ('error' in f) return fail('event', 'evento', f.error);
      await softDelete(calendarEvents, f.row.id, userId);
      return { ok: true, kind: 'event', label: `Evento eliminado: ${f.row.title}` };
    }
    case 'delete_habit': {
      const f = await findHabit(userId, p.match);
      if ('error' in f) return fail('habit', 'hábito', f.error);
      await softDelete(habits, f.row.id, userId);
      return { ok: true, kind: 'habit', label: `Hábito eliminado: ${f.row.name}` };
    }
    case 'delete_goal': {
      const f = await findGoal(userId, p.match);
      if ('error' in f) return fail('goal', 'meta', f.error);
      await softDelete(goals, f.row.id, userId);
      return { ok: true, kind: 'goal', label: `Meta eliminada: ${f.row.title}` };
    }
    case 'delete_note': {
      const f = await findNote(userId, p.match);
      if ('error' in f) return fail('note', 'nota', f.error);
      await softDelete(notes, f.row.id, userId);
      return { ok: true, kind: 'note', label: `Nota eliminada: ${f.row.title ?? 'Sin título'}` };
    }
    case 'delete_finance_entry': {
      const f = await findEntry(userId, p);
      if ('error' in f) return fail('finance', 'movimiento', f.error);
      await softDelete(financeEntries, f.row.id, userId);
      return { ok: true, kind: 'finance', label: `Movimiento eliminado: ${f.row.description ?? f.row.category} ($${Number(f.row.amount)})` };
    }
    case 'delete_budget': {
      const f = await findBudget(userId, p.match);
      if ('error' in f) return fail('finance', 'presupuesto', f.error);
      await softDelete(financeBudgets, f.row.id, userId);
      return { ok: true, kind: 'finance', label: `Presupuesto eliminado: ${f.row.category}` };
    }
    case 'delete_recurring': {
      const f = await findRecurring(userId, p.match);
      if ('error' in f) return fail('finance', 'recurrente', f.error);
      await softDelete(financeRecurring, f.row.id, userId);
      return { ok: true, kind: 'finance', label: `Recurrente eliminado: ${f.row.description ?? f.row.category}` };
    }
    default:
      return null;
  }
}
