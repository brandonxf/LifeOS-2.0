import { Router } from 'express';
import { and, desc, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  activityEvents,
  activityReactions,
  habits,
  habitMembers,
  tasks,
  taskAssignees,
  friendships,
  users,
} from '../db/schema/index.js';
import { asyncHandler, notFound } from '../lib/http.js';
import { currentUser } from '../middleware/auth.js';

const router = Router();

async function friendIdsOf(userId: string): Promise<string[]> {
  const rows = await db
    .select()
    .from(friendships)
    .where(and(eq(friendships.status, 'accepted'), or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId))));
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
}

/** Hábitos cuyos eventos puedo ver: los míos (dueño o miembro activo) más
 *  los de mis amigos que activaron "compartir progreso". */
async function visibleHabitIds(userId: string): Promise<string[]> {
  const own = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.userId, userId), isNull(habits.deletedAt)));
  const member = await db
    .select({ id: habitMembers.habitId })
    .from(habitMembers)
    .where(and(eq(habitMembers.userId, userId), eq(habitMembers.status, 'active')));
  const friendIds = await friendIdsOf(userId);
  const sharedByFriends = friendIds.length
    ? await db
        .select({ id: habits.id })
        .from(habits)
        .where(and(inArray(habits.userId, friendIds), eq(habits.shareProgress, true), isNull(habits.deletedAt)))
    : [];
  return [...new Set([...own.map((h) => h.id), ...member.map((m) => m.id), ...sharedByFriends.map((h) => h.id)])];
}

/** Tareas cuyos eventos puedo ver: las mías (dueño o asignado activo). No
 *  hay "compartir progreso" para tareas privadas (fuera de alcance). */
async function visibleTaskIds(userId: string): Promise<string[]> {
  const own = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)));
  const assigned = await db
    .select({ id: taskAssignees.taskId })
    .from(taskAssignees)
    .where(and(eq(taskAssignees.userId, userId), eq(taskAssignees.status, 'active')));
  return [...new Set([...own.map((t) => t.id), ...assigned.map((a) => a.id)])];
}

// GET /api/feed — actividad reciente de amigos/colaboradores, nunca la mía.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [habitIds, taskIds] = await Promise.all([visibleHabitIds(user.id), visibleTaskIds(user.id)]);

    const conds = [];
    if (habitIds.length) conds.push(and(eq(activityEvents.kind, 'habit_completed'), inArray(activityEvents.entityId, habitIds)));
    if (taskIds.length) conds.push(and(eq(activityEvents.kind, 'task_completed'), inArray(activityEvents.entityId, taskIds)));
    if (!conds.length) return res.json([]);

    const rows = await db
      .select({ event: activityEvents, actor: users })
      .from(activityEvents)
      .innerJoin(users, eq(users.id, activityEvents.userId))
      .where(and(ne(activityEvents.userId, user.id), or(...conds)))
      .orderBy(desc(activityEvents.createdAt))
      .limit(50);

    const eventIds = rows.map((r) => r.event.id);
    const reactionRows = eventIds.length
      ? await db.select().from(activityReactions).where(inArray(activityReactions.eventId, eventIds))
      : [];
    const countByEvent: Record<string, number> = {};
    const mineByEvent: Record<string, boolean> = {};
    for (const r of reactionRows) {
      countByEvent[r.eventId] = (countByEvent[r.eventId] ?? 0) + 1;
      if (r.userId === user.id) mineByEvent[r.eventId] = true;
    }

    res.json(
      rows.map((r) => ({
        id: r.event.id,
        kind: r.event.kind,
        label: r.event.label,
        actor: { id: r.actor.id, name: r.actor.name, avatar: r.actor.avatar },
        createdAt: r.event.createdAt,
        reactionCount: countByEvent[r.event.id] ?? 0,
        reactedByMe: !!mineByEvent[r.event.id],
      })),
    );
  }),
);

// POST /api/feed/:eventId/react — alterna mi aplauso a un evento visible para mí.
router.post(
  '/:eventId/react',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [event] = await db
      .select()
      .from(activityEvents)
      .where(eq(activityEvents.id, req.params.eventId))
      .limit(1);
    if (!event) throw notFound('Evento no encontrado');

    const visibleIds = event.kind === 'habit_completed' ? await visibleHabitIds(user.id) : await visibleTaskIds(user.id);
    if (event.userId === user.id || !visibleIds.includes(event.entityId)) throw notFound('Evento no encontrado');

    const [existing] = await db
      .select()
      .from(activityReactions)
      .where(and(eq(activityReactions.eventId, event.id), eq(activityReactions.userId, user.id)))
      .limit(1);

    if (existing) {
      await db.delete(activityReactions).where(eq(activityReactions.id, existing.id));
    } else {
      await db.insert(activityReactions).values({ eventId: event.id, userId: user.id });
    }

    const countRows = await db.select().from(activityReactions).where(eq(activityReactions.eventId, event.id));
    res.json({ reactionCount: countRows.length, reactedByMe: !existing });
  }),
);

export default router;
