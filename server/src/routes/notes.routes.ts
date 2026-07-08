import { Router } from 'express';
import { z } from 'zod';
import { and, desc, eq, isNull, sql, cosineDistance, gt } from 'drizzle-orm';
import { db } from '../db';
import { notes } from '../db/schema';
import { asyncHandler, notFound, validate } from '../lib/http';
import { currentUser } from '../middleware/auth';
import { embed } from '../services/embedding.service';

const router = Router();

const noteSchema = z.object({
  title: z.string().default('Untitled'),
  content: z.string().default(''),
  color: z.string().optional(),
  tags: z.array(z.string()).default([]),
  pinned: z.boolean().default(false),
});

function stripEmbedding<T extends { embedding?: unknown }>(row: T) {
  const { embedding, ...rest } = row;
  return rest;
}

// GET /api/notes/search?q= — semantic search via pgvector cosine similarity
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const q = String((req.query as any).q ?? '').trim();
    if (!q) {
      res.json([]);
      return;
    }
    const queryEmbedding = embed(q);
    const similarity = sql<number>`1 - (${cosineDistance(notes.embedding, queryEmbedding)})`;

    const rows = await db
      .select({
        id: notes.id,
        userId: notes.userId,
        title: notes.title,
        content: notes.content,
        color: notes.color,
        tags: notes.tags,
        pinned: notes.pinned,
        createdAt: notes.createdAt,
        updatedAt: notes.updatedAt,
        similarity,
      })
      .from(notes)
      .where(
        and(
          eq(notes.userId, user.id),
          isNull(notes.deletedAt),
          gt(similarity, 0.1),
        ),
      )
      .orderBy(desc(similarity))
      .limit(20);

    res.json(rows);
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const rows = await db
      .select()
      .from(notes)
      .where(and(eq(notes.userId, user.id), isNull(notes.deletedAt)))
      .orderBy(desc(notes.pinned), desc(notes.updatedAt));
    res.json(rows.map(stripEmbedding));
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(noteSchema, req.body);
    const embedding = embed(`${body.title}\n${body.content}`);
    const [row] = await db
      .insert(notes)
      .values({
        userId: user.id,
        title: body.title,
        content: body.content,
        color: body.color ?? '#1f2937',
        tags: body.tags,
        pinned: body.pinned,
        embedding,
      })
      .returning();
    res.status(201).json(stripEmbedding(row));
  }),
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(noteSchema.partial(), req.body);

    // Recompute embedding when text changes.
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (body.title !== undefined) patch.title = body.title;
    if (body.content !== undefined) patch.content = body.content;
    if (body.color !== undefined) patch.color = body.color;
    if (body.tags !== undefined) patch.tags = body.tags;
    if (body.pinned !== undefined) patch.pinned = body.pinned;
    if (body.title !== undefined || body.content !== undefined) {
      patch.embedding = embed(`${body.title ?? ''}\n${body.content ?? ''}`);
    }

    const [row] = await db
      .update(notes)
      .set(patch)
      .where(and(eq(notes.id, req.params.id), eq(notes.userId, user.id)))
      .returning();
    if (!row) throw notFound('Note not found');
    res.json(stripEmbedding(row));
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [row] = await db
      .update(notes)
      .set({ deletedAt: new Date() })
      .where(and(eq(notes.id, req.params.id), eq(notes.userId, user.id)))
      .returning();
    if (!row) throw notFound('Note not found');
    res.json({ ok: true });
  }),
);

export default router;
