import { Router } from 'express';
import { z } from 'zod';
import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { habits, habitLogs, habitMembers, friendships, users } from '../db/schema/index.js';
import { asyncHandler, badRequest, forbidden, notFound, validate } from '../lib/http.js';
import { currentUser } from '../middleware/auth.js';
import { bogotaISODate, shiftIsoDate, currentStreakFromDates } from '../lib/date.js';

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

    const ownHabits = await db
      .select()
      .from(habits)
      .where(and(eq(habits.userId, user.id), isNull(habits.deletedAt)))
      .orderBy(desc(habits.createdAt));

    const memberRows = await db
      .select({ habit: habits })
      .from(habitMembers)
      .innerJoin(habits, eq(habits.id, habitMembers.habitId))
      .where(and(eq(habitMembers.userId, user.id), eq(habitMembers.status, 'active'), isNull(habits.deletedAt)));

    const allHabits = [
      ...ownHabits.map((h) => ({ ...h, isOwner: true })),
      ...memberRows.map((r) => ({ ...r.habit, isOwner: false })),
    ];
    if (!allHabits.length) return res.json([]);

    const habitIds = allHabits.map((h) => h.id);

    // Mis propios logs (lo que alimenta el heatmap, siempre "mi" vista).
    const myLogs = await db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.userId, user.id), inArray(habitLogs.habitId, habitIds)));
    const logsByHabit: Record<string, string[]> = {};
    for (const l of myLogs) (logsByHabit[l.habitId] ??= []).push(l.date);

    // Miembros activos por hábito (para la fila de progreso de los demás).
    const activeMembers = await db
      .select({ member: habitMembers, u: users })
      .from(habitMembers)
      .innerJoin(users, eq(users.id, habitMembers.userId))
      .where(and(inArray(habitMembers.habitId, habitIds), eq(habitMembers.status, 'active')));

    const membersByHabit: Record<string, { userId: string; name: string; avatar: string | null }[]> = {};
    for (const m of activeMembers) {
      (membersByHabit[m.member.habitId] ??= []).push({ userId: m.u.id, name: m.u.name, avatar: m.u.avatar });
    }

    const sharedHabits = allHabits.filter((h) => (membersByHabit[h.id]?.length ?? 0) > 0);
    const membersOut: Record<string, { id: string; name: string; avatar: string | null; streak: number; doneToday: boolean }[]> = {};

    if (sharedHabits.length) {
      const ownerIds = [...new Set(sharedHabits.map((h) => h.userId))];
      const ownerUsers = await db.select().from(users).where(inArray(users.id, ownerIds));
      const ownerById = Object.fromEntries(ownerUsers.map((u) => [u.id, u]));

      const sharedHabitIds = sharedHabits.map((h) => h.id);
      const participantIds = [
        ...new Set([...ownerIds, ...sharedHabits.flatMap((h) => (membersByHabit[h.id] ?? []).map((m) => m.userId))]),
      ];
      const allLogs = await db
        .select()
        .from(habitLogs)
        .where(and(inArray(habitLogs.habitId, sharedHabitIds), inArray(habitLogs.userId, participantIds)));

      const logsByHabitUser: Record<string, Set<string>> = {};
      for (const l of allLogs) {
        const key = `${l.habitId}:${l.userId}`;
        (logsByHabitUser[key] ??= new Set()).add(l.date);
      }

      const today = bogotaISODate();
      for (const h of sharedHabits) {
        const owner = ownerById[h.userId];
        const participants = [
          ...(owner ? [{ userId: owner.id, name: owner.name, avatar: owner.avatar }] : []),
          ...(membersByHabit[h.id] ?? []),
        ];
        membersOut[h.id] = participants.map((p) => {
          const dates = logsByHabitUser[`${h.id}:${p.userId}`] ?? new Set<string>();
          return {
            id: p.userId,
            name: p.name,
            avatar: p.avatar,
            streak: currentStreakFromDates(dates),
            doneToday: dates.has(today),
            // Historial completo de este miembro, para que el heatmap del
            // cliente pueda pintar cada día según cuántos ya lo completaron.
            dates: [...dates],
          };
        });
      }
    }

    res.json(
      allHabits.map((h) => ({
        ...h,
        logs: logsByHabit[h.id] ?? [],
        members: membersOut[h.id],
      })),
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
    res.status(201).json({ ...row, isOwner: true, logs: [] });
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

// GET /api/habits/invites — invitaciones a hábitos compartidos, pendientes para mí.
router.get(
  '/invites',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const rows = await db
      .select({ member: habitMembers, habit: habits, inviter: users })
      .from(habitMembers)
      .innerJoin(habits, eq(habits.id, habitMembers.habitId))
      .innerJoin(users, eq(users.id, habitMembers.invitedBy))
      .where(and(eq(habitMembers.userId, user.id), eq(habitMembers.status, 'invited')));

    res.json(
      rows.map((r) => ({
        id: r.member.id,
        habit: { id: r.habit.id, name: r.habit.name, icon: r.habit.icon, color: r.habit.color },
        invitedBy: { name: r.inviter.name },
      })),
    );
  }),
);

router.post(
  '/invites/:id/accept',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [row] = await db
      .update(habitMembers)
      .set({ status: 'active', respondedAt: new Date() })
      .where(
        and(eq(habitMembers.id, req.params.id), eq(habitMembers.userId, user.id), eq(habitMembers.status, 'invited')),
      )
      .returning();
    if (!row) throw notFound('Invitación no encontrada');
    res.json({ ok: true });
  }),
);

router.post(
  '/invites/:id/decline',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [row] = await db
      .delete(habitMembers)
      .where(
        and(eq(habitMembers.id, req.params.id), eq(habitMembers.userId, user.id), eq(habitMembers.status, 'invited')),
      )
      .returning();
    if (!row) throw notFound('Invitación no encontrada');
    res.json({ ok: true });
  }),
);

const inviteSchema = z.object({ friendId: z.string().uuid() });

// POST /api/habits/:id/invite — el dueño invita a un amigo a este hábito.
router.post(
  '/:id/invite',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { friendId } = validate(inviteSchema, req.body);

    const [habit] = await db
      .select({ id: habits.id })
      .from(habits)
      .where(and(eq(habits.id, req.params.id), eq(habits.userId, user.id), isNull(habits.deletedAt)))
      .limit(1);
    if (!habit) throw notFound('Habit not found');
    if (friendId === user.id) throw badRequest('No puedes invitarte a ti mismo');

    const [friendship] = await db
      .select({ id: friendships.id })
      .from(friendships)
      .where(
        and(
          eq(friendships.status, 'accepted'),
          or(
            and(eq(friendships.requesterId, user.id), eq(friendships.addresseeId, friendId)),
            and(eq(friendships.requesterId, friendId), eq(friendships.addresseeId, user.id)),
          ),
        ),
      )
      .limit(1);
    if (!friendship) throw badRequest('Solo puedes invitar a tus amigos');

    const [existing] = await db
      .select({ status: habitMembers.status })
      .from(habitMembers)
      .where(and(eq(habitMembers.habitId, habit.id), eq(habitMembers.userId, friendId)))
      .limit(1);
    if (existing) {
      throw badRequest(existing.status === 'active' ? 'Ya es miembro de este hábito' : 'Ya tiene una invitación pendiente');
    }

    const [row] = await db
      .insert(habitMembers)
      .values({ habitId: habit.id, userId: friendId, invitedBy: user.id })
      .returning();
    res.status(201).json({ id: row.id });
  }),
);

// DELETE /api/habits/:id/members/:memberId — el dueño quita a alguien, o un
// miembro se sale él mismo.
router.delete(
  '/:id/members/:memberId',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [habit] = await db
      .select({ userId: habits.userId })
      .from(habits)
      .where(and(eq(habits.id, req.params.id), isNull(habits.deletedAt)))
      .limit(1);
    if (!habit) throw notFound('Habit not found');

    const isOwner = habit.userId === user.id;
    const isSelf = req.params.memberId === user.id;
    if (!isOwner && !isSelf) throw forbidden();

    const [row] = await db
      .delete(habitMembers)
      .where(and(eq(habitMembers.habitId, req.params.id), eq(habitMembers.userId, req.params.memberId)))
      .returning();
    if (!row) throw notFound('Miembro no encontrado');
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
    const day = date ?? bogotaISODate();

    const [habit] = await db
      .select({ userId: habits.userId, name: habits.name })
      .from(habits)
      .where(and(eq(habits.id, req.params.id), isNull(habits.deletedAt)))
      .limit(1);
    if (!habit) throw notFound('Habit not found');

    if (habit.userId !== user.id) {
      const [membership] = await db
        .select({ id: habitMembers.id })
        .from(habitMembers)
        .where(
          and(
            eq(habitMembers.habitId, req.params.id),
            eq(habitMembers.userId, user.id),
            eq(habitMembers.status, 'active'),
          ),
        )
        .limit(1);
      if (!membership) throw notFound('Habit not found');
    }

    const [existing] = await db
      .select()
      .from(habitLogs)
      .where(and(eq(habitLogs.habitId, req.params.id), eq(habitLogs.userId, user.id), eq(habitLogs.date, day)))
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
      .where(and(eq(habitLogs.habitId, req.params.id), eq(habitLogs.userId, user.id)))
      .orderBy(desc(habitLogs.date));

    const dates = new Set(logs.map((l) => l.date));

    const current = currentStreakFromDates(dates);

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

    // Last-30-day completion rate (los 30 días terminan hoy, hora Colombia).
    const todayIso = bogotaISODate();
    let completed30 = 0;
    for (let i = 0; i < 30; i++) {
      if (dates.has(shiftIsoDate(todayIso, -i))) completed30++;
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
