import { Router } from 'express';
import { z } from 'zod';
import { and, desc, eq, gte, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { healthLogs } from '../db/schema/index.js';
import { asyncHandler, notFound, validate } from '../lib/http.js';
import { currentUser } from '../middleware/auth.js';

const router = Router();

const logSchema = z.object({
  type: z.enum(['workout', 'water', 'sleep', 'weight']),
  value: z.number().positive(),
  unit: z.string().min(1),
  notes: z.string().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

router.get(
  '/logs',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { type } = req.query as Record<string, string>;
    const conds = [eq(healthLogs.userId, user.id), isNull(healthLogs.deletedAt)];
    if (type) conds.push(eq(healthLogs.type, type as any));
    const rows = await db
      .select()
      .from(healthLogs)
      .where(and(...conds))
      .orderBy(desc(healthLogs.date));
    res.json(rows);
  }),
);

router.post(
  '/logs',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(logSchema, req.body);
    const [row] = await db
      .insert(healthLogs)
      .values({
        userId: user.id,
        type: body.type,
        value: body.value.toString(),
        unit: body.unit,
        notes: body.notes ?? null,
        date: body.date,
      })
      .returning();
    res.status(201).json(row);
  }),
);

router.delete(
  '/logs/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [row] = await db
      .update(healthLogs)
      .set({ deletedAt: new Date() })
      .where(and(eq(healthLogs.id, req.params.id), eq(healthLogs.userId, user.id)))
      .returning();
    if (!row) throw notFound('Log not found');
    res.json({ ok: true });
  }),
);

// GET /api/health/summary — last 7 days aggregated per metric
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const since = new Date();
    since.setDate(since.getDate() - 6);
    const sinceISO = since.toISOString().slice(0, 10);

    const rows = await db
      .select()
      .from(healthLogs)
      .where(
        and(
          eq(healthLogs.userId, user.id),
          isNull(healthLogs.deletedAt),
          gte(healthLogs.date, sinceISO),
        ),
      )
      .orderBy(desc(healthLogs.date));

    const summary: Record<string, { total: number; count: number; latest: number; unit: string; series: { date: string; value: number }[] }> = {};
    for (const r of rows) {
      const v = Number(r.value);
      summary[r.type] ??= { total: 0, count: 0, latest: v, unit: r.unit, series: [] };
      summary[r.type].total += v;
      summary[r.type].count += 1;
      summary[r.type].series.push({ date: r.date, value: v });
    }

    for (const key of Object.keys(summary)) {
      summary[key].series.sort((a, b) => a.date.localeCompare(b.date));
    }

    res.json(summary);
  }),
);

export default router;
