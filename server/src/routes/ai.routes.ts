import { Router } from 'express';
import { z } from 'zod';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { conversations, chatMessages } from '../db/schema/index.js';
import { asyncHandler, notFound, validate } from '../lib/http.js';
import { currentUser } from '../middleware/auth.js';
import { getNotifications } from '../services/notification.service.js';
import {
  buildUserContext,
  buildSystemPrompt,
  contextBadge,
  streamChat,
  runAssistantActions,
  stripActionBlocks,
  type ChatMessage,
} from '../services/ai.service.js';

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.string().uuid().optional().nullable(),
});

function makeTitle(message: string): string {
  const clean = message.replace(/\s+/g, ' ').trim();
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean || 'Nuevo chat';
}

// ── Conversations CRUD ──────────────────────────────────────────────────

// GET /api/ai/conversations — list (most recent first)
router.get(
  '/conversations',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const rows = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.userId, user.id), isNull(conversations.deletedAt)))
      .orderBy(desc(conversations.updatedAt));
    res.json(rows);
  }),
);

// GET /api/ai/conversations/:id — a conversation with its messages
router.get(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [convo] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, req.params.id),
          eq(conversations.userId, user.id),
          isNull(conversations.deletedAt),
        ),
      )
      .limit(1);
    if (!convo) throw notFound('Conversación no encontrada');

    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, convo.id))
      .orderBy(asc(chatMessages.createdAt));

    res.json({ ...convo, messages });
  }),
);

// PATCH /api/ai/conversations/:id — rename
router.patch(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { title } = validate(z.object({ title: z.string().min(1).max(120) }), req.body);
    const [row] = await db
      .update(conversations)
      .set({ title, updatedAt: new Date() })
      .where(and(eq(conversations.id, req.params.id), eq(conversations.userId, user.id)))
      .returning();
    if (!row) throw notFound('Conversación no encontrada');
    res.json(row);
  }),
);

// DELETE /api/ai/conversations/:id — soft delete
router.delete(
  '/conversations/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [row] = await db
      .update(conversations)
      .set({ deletedAt: new Date() })
      .where(and(eq(conversations.id, req.params.id), eq(conversations.userId, user.id)))
      .returning();
    if (!row) throw notFound('Conversación no encontrada');
    res.json({ ok: true });
  }),
);

// ── Chat (streams + persists) ───────────────────────────────────────────

// POST /api/ai/chat — streams the assistant reply via SSE and saves history
router.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(chatSchema, req.body);

    // Resolve the conversation: reuse an existing one or create a new one.
    let convo;
    if (body.conversationId) {
      [convo] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, body.conversationId),
            eq(conversations.userId, user.id),
            isNull(conversations.deletedAt),
          ),
        )
        .limit(1);
      if (!convo) throw notFound('Conversación no encontrada');
    } else {
      [convo] = await db
        .insert(conversations)
        .values({ userId: user.id, title: makeTitle(body.message) })
        .returning();
    }

    // Load prior history from the DB so the model has full context.
    const history: ChatMessage[] = (
      await db
        .select({ role: chatMessages.role, content: chatMessages.content })
        .from(chatMessages)
        .where(eq(chatMessages.conversationId, convo.id))
        .orderBy(asc(chatMessages.createdAt))
    ).map((m) => ({ role: m.role, content: m.content }));

    // Persist the user's message immediately.
    await db.insert(chatMessages).values({
      conversationId: convo.id,
      userId: user.id,
      role: 'user',
      content: body.message,
    });

    const ctx = await buildUserContext(user.id);
    const systemPrompt = buildSystemPrompt(ctx, user.name);
    const badge = contextBadge(ctx);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Let the client know which conversation this belongs to (esp. for new ones).
    send('meta', { conversationId: convo.id, title: convo.title });
    send('context', { badge });

    let assistantText = '';

    await streamChat(systemPrompt, history, body.message, {
      onDelta: (text) => {
        assistantText += text;
        send('delta', { text });
      },
      onDone: async () => {
        // Save the assistant reply and bump the conversation's timestamp.
        if (assistantText.trim()) {
          // Ejecuta cualquier acción que el asistente haya solicitado.
          let results: Awaited<ReturnType<typeof runAssistantActions>> = [];
          try {
            results = await runAssistantActions(user.id, assistantText);
          } catch {
            /* si falla la ejecución, no rompemos el chat */
          }
          if (results.length) send('action', { results });

          await db.insert(chatMessages).values({
            conversationId: convo.id,
            userId: user.id,
            role: 'assistant',
            content: stripActionBlocks(assistantText) || assistantText,
          });
        }
        await db
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, convo.id));
        send('done', {});
        res.end();
      },
      onError: (message) => {
        send('error', { message });
        res.end();
      },
    });
  }),
);

// GET /api/ai/notifications — in-app reminders (also used by the bell icon)
router.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    res.json(await getNotifications(user.id));
  }),
);

export default router;
