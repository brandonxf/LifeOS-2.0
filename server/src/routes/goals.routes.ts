import { Router } from 'express';
import { z } from 'zod';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { goals } from '../db/schema/index.js';
import { asyncHandler, notFound, validate } from '../lib/http.js';
import { currentUser } from '../middleware/auth.js';

const router = Router();

const goalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  category: z.string().optional(),
  targetValue: z.number().positive().default(100),
  currentValue: z.number().min(0).default(0),
  unit: z.string().optional(),
  status: z.enum(['active', 'completed', 'archived']).default('active'),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const rows = await db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, user.id), isNull(goals.deletedAt)))
      .orderBy(desc(goals.createdAt));
    res.json(rows);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(goalSchema, req.body);
    const [row] = await db
      .insert(goals)
      .values({
        userId: user.id,
        title: body.title,
        description: body.description ?? null,
        category: body.category ?? 'personal',
        targetValue: (body.targetValue ?? 100).toString(),
        currentValue: (body.currentValue ?? 0).toString(),
        unit: body.unit ?? '%',
        status: body.status,
        deadline: body.deadline ?? null,
      })
      .returning();
    res.status(201).json(row);
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(goalSchema.partial(), req.body);
    const [row] = await db
      .update(goals)
      .set({
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.category && { category: body.category }),
        ...(body.targetValue !== undefined && { targetValue: body.targetValue.toString() }),
        ...(body.currentValue !== undefined && { currentValue: body.currentValue.toString() }),
        ...(body.unit && { unit: body.unit }),
        ...(body.status && { status: body.status }),
        ...(body.deadline !== undefined && { deadline: body.deadline }),
      })
      .where(and(eq(goals.id, req.params.id), eq(goals.userId, user.id)))
      .returning();
    if (!row) throw notFound('Goal not found');
    res.json(row);
  }),
);

router.patch(
  '/:id/progress',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { currentValue } = validate(
      z.object({ currentValue: z.number().min(0) }),
      req.body,
    );
    const [existing] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, req.params.id), eq(goals.userId, user.id)))
      .limit(1);
    if (!existing) throw notFound('Goal not found');

    const completed = currentValue >= Number(existing.targetValue);
    const [row] = await db
      .update(goals)
      .set({
        currentValue: currentValue.toString(),
        status: completed ? 'completed' : existing.status === 'completed' ? 'active' : existing.status,
      })
      .where(eq(goals.id, existing.id))
      .returning();
    res.json(row);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [row] = await db
      .update(goals)
      .set({ deletedAt: new Date() })
      .where(and(eq(goals.id, req.params.id), eq(goals.userId, user.id)))
      .returning();
    if (!row) throw notFound('Goal not found');
    res.json({ ok: true });
  }),
);

export default router;
