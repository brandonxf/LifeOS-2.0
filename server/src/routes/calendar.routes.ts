import { Router } from 'express';
import { z } from 'zod';
import { and, asc, eq, gte, isNull, lte } from 'drizzle-orm';
import { db } from '../db';
import { calendarEvents } from '../db/schema';
import { asyncHandler, notFound, validate } from '../lib/http';
import { currentUser } from '../middleware/auth';

const router = Router();

const eventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  color: z.string().default('#7C3AED'),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  allDay: z.boolean().default(false),
});

router.get(
  '/events',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { start, end } = req.query as Record<string, string>;
    const conds = [eq(calendarEvents.userId, user.id), isNull(calendarEvents.deletedAt)];
    if (start) conds.push(gte(calendarEvents.startTime, new Date(start)));
    if (end) conds.push(lte(calendarEvents.startTime, new Date(end)));

    const rows = await db
      .select()
      .from(calendarEvents)
      .where(and(...conds))
      .orderBy(asc(calendarEvents.startTime));
    res.json(rows);
  }),
);

router.post(
  '/events',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(eventSchema, req.body);
    const [row] = await db
      .insert(calendarEvents)
      .values({
        userId: user.id,
        title: body.title,
        description: body.description ?? null,
        location: body.location ?? null,
        color: body.color,
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
        allDay: body.allDay,
      })
      .returning();
    res.status(201).json(row);
  }),
);

router.put(
  '/events/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(eventSchema.partial(), req.body);
    const [row] = await db
      .update(calendarEvents)
      .set({
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.color && { color: body.color }),
        ...(body.startTime && { startTime: new Date(body.startTime) }),
        ...(body.endTime && { endTime: new Date(body.endTime) }),
        ...(body.allDay !== undefined && { allDay: body.allDay }),
      })
      .where(and(eq(calendarEvents.id, req.params.id), eq(calendarEvents.userId, user.id)))
      .returning();
    if (!row) throw notFound('Event not found');
    res.json(row);
  }),
);

router.delete(
  '/events/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [row] = await db
      .update(calendarEvents)
      .set({ deletedAt: new Date() })
      .where(and(eq(calendarEvents.id, req.params.id), eq(calendarEvents.userId, user.id)))
      .returning();
    if (!row) throw notFound('Event not found');
    res.json({ ok: true });
  }),
);

export default router;
