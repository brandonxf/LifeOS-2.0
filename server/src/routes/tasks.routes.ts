import { Router } from 'express';
import { z } from 'zod';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db';
import { tasks } from '../db/schema';
import { asyncHandler, notFound, validate } from '../lib/http';
import { currentUser } from '../middleware/auth';

const router = Router();

const taskSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().optional().nullable(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
  tags: z.array(z.string()).default([]),
  dueDate: z.string().datetime().optional().nullable(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { status, priority } = req.query as Record<string, string>;
    const conds = [eq(tasks.userId, user.id), isNull(tasks.deletedAt)];
    if (status) conds.push(eq(tasks.status, status as any));
    if (priority) conds.push(eq(tasks.priority, priority as any));

    const rows = await db
      .select()
      .from(tasks)
      .where(and(...conds))
      .orderBy(asc(tasks.status), desc(tasks.createdAt));
    res.json(rows);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(taskSchema, req.body);
    const [row] = await db
      .insert(tasks)
      .values({
        userId: user.id,
        title: body.title,
        description: body.description ?? null,
        priority: body.priority,
        status: body.status,
        tags: body.tags,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        completedAt: body.status === 'done' ? new Date() : null,
      })
      .returning();
    res.status(201).json(row);
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(taskSchema.partial(), req.body);
    const [row] = await db
      .update(tasks)
      .set({
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.priority && { priority: body.priority }),
        ...(body.status && {
          status: body.status,
          completedAt: body.status === 'done' ? new Date() : null,
        }),
        ...(body.tags && { tags: body.tags }),
        ...(body.dueDate !== undefined && {
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
        }),
      })
      .where(and(eq(tasks.id, req.params.id), eq(tasks.userId, user.id)))
      .returning();
    if (!row) throw notFound('Task not found');
    res.json(row);
  }),
);

router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { status } = validate(
      z.object({ status: z.enum(['todo', 'in_progress', 'done']) }),
      req.body,
    );
    const [row] = await db
      .update(tasks)
      .set({ status, completedAt: status === 'done' ? new Date() : null })
      .where(and(eq(tasks.id, req.params.id), eq(tasks.userId, user.id)))
      .returning();
    if (!row) throw notFound('Task not found');
    res.json(row);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [row] = await db
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(and(eq(tasks.id, req.params.id), eq(tasks.userId, user.id)))
      .returning();
    if (!row) throw notFound('Task not found');
    res.json({ ok: true });
  }),
);

export default router;
