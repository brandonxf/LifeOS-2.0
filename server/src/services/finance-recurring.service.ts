import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { financeEntries, financeRecurring } from '../db/schema/index.js';
import { bogotaISODate } from '../lib/date.js';

/** Suma `n` unidades de la frecuencia dada a una fecha "YYYY-MM-DD". */
function step(dateIso: string, frequency: 'weekly' | 'monthly' | 'yearly'): string {
  const d = new Date(`${dateIso}T00:00:00Z`);
  if (frequency === 'weekly') d.setUTCDate(d.getUTCDate() + 7);
  else if (frequency === 'monthly') d.setUTCMonth(d.getUTCMonth() + 1);
  else d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

/** Genera, de forma idempotente, las transacciones que ya se vencieron
 *  para cada plantilla recurrente activa del usuario (hasta hoy inclusive).
 *  Se llama al leer /entries o /summary: no depende de un cron. */
export async function generateDueRecurringEntries(userId: string): Promise<void> {
  const todayIso = bogotaISODate();

  const templates = await db
    .select()
    .from(financeRecurring)
    .where(and(eq(financeRecurring.userId, userId), eq(financeRecurring.active, true), isNull(financeRecurring.deletedAt)));

  for (const t of templates) {
    if (t.endDate && t.endDate < t.startDate) continue;

    let cursor = t.lastGeneratedDate ? step(t.lastGeneratedDate, t.frequency) : t.startDate;
    const toInsert: string[] = [];
    let guard = 0;
    while (cursor <= todayIso && (!t.endDate || cursor <= t.endDate) && guard < 500) {
      toInsert.push(cursor);
      cursor = step(cursor, t.frequency);
      guard++;
    }
    if (toInsert.length === 0) continue;

    await db.insert(financeEntries).values(
      toInsert.map((date) => ({
        userId,
        type: t.type,
        amount: t.amount,
        category: t.category,
        description: t.description,
        date,
        recurringId: t.id,
      })),
    );
    await db
      .update(financeRecurring)
      .set({ lastGeneratedDate: toInsert[toInsert.length - 1] })
      .where(eq(financeRecurring.id, t.id));
  }
}
