import { Router } from 'express';
import { z } from 'zod';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db';
import { habits, habitLogs } from '../db/schema';
import { asyncHandler, notFound, validate } from '../lib/http';
import { currentUser } from '../middleware/auth';

const router = Router();

const habitSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().optional().nullable(),
  icon: z.string().optional(),
  color: z.string().optional(),
  frequency: z.enum(['daily', 'weekly']).default('daily'),
  targetPerWeek: z.number().int().min(1).max(7).default(7),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const habitRows = await db
      .select()
      .from(habits)
      .where(and(eq(habits.userId, user.id), isNull(habits.deletedAt)))
      .orderBy(desc(habits.createdAt));

    // Attach recent logs (last 120 days) so the client can render heatmaps.
    const logs = await db
      .select()
      .from(habitLogs)
      .where(eq(habitLogs.userId, user.id));

    const logsByHabit: Record<string, string[]> = {};
    for (const l of logs) {
      (logsByHabit[l.habitId] ??= []).push(l.date);
    }

    res.json(
      habitRows.map((h) => ({ ...h, logs: logsByHabit[h.id] ?? [] })),
    );
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(habitSchema, req.body);
    const [row] = await db
      .insert(habits)
      .values({ userId: user.id, ...body, description: body.description ?? null })
      .returning();
    res.status(201).json({ ...row, logs: [] });
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(habitSchema.partial(), req.body);
    const [row] = await db
      .update(habits)
      .set(body)
      .where(and(eq(habits.id, req.params.id), eq(habits.userId, user.id)))
      .returning();
    if (!row) throw notFound('Habit not found');
    res.json(row);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [row] = await db
      .update(habits)
      .set({ deletedAt: new Date() })
      .where(and(eq(habits.id, req.params.id), eq(habits.userId, user.id)))
      .returning();
    if (!row) throw notFound('Habit not found');
    res.json({ ok: true });
  }),
);

// POST /api/habits/:id/log — toggle completion for a given date (default today)
router.post(
  '/:id/log',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { date } = validate(
      z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }),
      req.body ?? {},
    );
    const day = date ?? new Date().toISOString().slice(0, 10);

    const [habit] = await db
      .select({ id: habits.id })
      .from(habits)
      .where(and(eq(habits.id, req.params.id), eq(habits.userId, user.id), isNull(habits.deletedAt)))
      .limit(1);
    if (!habit) throw notFound('Habit not found');

    const [existing] = await db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.habitId, req.params.id), eq(habitLogs.date, day)))
      .limit(1);

    if (existing) {
      await db.delete(habitLogs).where(eq(habitLogs.id, existing.id));
      res.json({ date: day, done: false });
    } else {
      await db.insert(habitLogs).values({ habitId: req.params.id, userId: user.id, date: day });
      res.json({ date: day, done: true });
    }
  }),
);

// GET /api/habits/:id/stats — streaks and completion rate
router.get(
  '/:id/stats',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [habit] = await db
      .select()
      .from(habits)
      .where(and(eq(habits.id, req.params.id), eq(habits.userId, user.id)))
      .limit(1);
    if (!habit) throw notFound('Habit not found');

    const logs = await db
      .select({ date: habitLogs.date })
      .from(habitLogs)
      .where(eq(habitLogs.habitId, req.params.id))
      .orderBy(desc(habitLogs.date));

    const dates = new Set(logs.map((l) => l.date));

    // Current streak (consecutive days ending today or yesterday).
    let current = 0;
    const cursor = new Date();
    if (!dates.has(cursor.toISOString().slice(0, 10))) {
      cursor.setDate(cursor.getDate() - 1); // allow "yesterday" to keep streak
    }
    while (dates.has(cursor.toISOString().slice(0, 10))) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    }

    // Longest streak.
    const sorted = [...dates].sort();
    let longest = 0;
    let run = 0;
    let prev: Date | null = null;
    for (const d of sorted) {
      const cur = new Date(d);
      if (prev && (cur.getTime() - prev.getTime()) / 86400000 === 1) run++;
      else run = 1;
      longest = Math.max(longest, run);
      prev = cur;
    }

    // Last-30-day completion rate.
    const last30 = new Date();
    last30.setDate(last30.getDate() - 29);
    let completed30 = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(last30);
      d.setDate(d.getDate() + i);
      if (dates.has(d.toISOString().slice(0, 10))) completed30++;
    }

    res.json({
      totalCompletions: logs.length,
      currentStreak: current,
      longestStreak: longest,
      completionRate30: Math.round((completed30 / 30) * 100),
    });
  }),
);

export default router;
