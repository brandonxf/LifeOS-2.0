import { Router } from 'express';
import { z } from 'zod';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { diaryEntries } from '../db/schema/index.js';
import { asyncHandler, notFound, validate } from '../lib/http.js';
import { currentUser } from '../middleware/auth.js';

const router = Router();

const diarySchema = z.object({
  title: z.string().optional().nullable(),
  content: z.string().default(''),
  mood: z.number().int().min(1).max(5).default(3),
  tags: z.array(z.string()).default([]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const rows = await db
      .select()
      .from(diaryEntries)
      .where(and(eq(diaryEntries.userId, user.id), isNull(diaryEntries.deletedAt)))
      .orderBy(desc(diaryEntries.date));
    res.json(rows);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(diarySchema, req.body);
    const [row] = await db
      .insert(diaryEntries)
      .values({
        userId: user.id,
        title: body.title ?? null,
        content: body.content,
        mood: body.mood,
        tags: body.tags,
        date: body.date,
      })
      .returning();
    res.status(201).json(row);
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(diarySchema.partial(), req.body);
    const [row] = await db
      .update(diaryEntries)
      .set({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.mood !== undefined && { mood: body.mood }),
        ...(body.tags && { tags: body.tags }),
        ...(body.date && { date: body.date }),
        updatedAt: new Date(),
      })
      .where(and(eq(diaryEntries.id, req.params.id), eq(diaryEntries.userId, user.id)))
      .returning();
    if (!row) throw notFound('Diary entry not found');
    res.json(row);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [row] = await db
      .update(diaryEntries)
      .set({ deletedAt: new Date() })
      .where(and(eq(diaryEntries.id, req.params.id), eq(diaryEntries.userId, user.id)))
      .returning();
    if (!row) throw notFound('Diary entry not found');
    res.json({ ok: true });
  }),
);

export default router;
