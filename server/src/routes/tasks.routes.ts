import { Router } from 'express';
import { z } from 'zod';
import { and, asc, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tasks, taskAssignees, friendships, users } from '../db/schema/index.js';
import { asyncHandler, badRequest, forbidden, notFound, validate } from '../lib/http.js';
import { currentUser } from '../middleware/auth.js';

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

    const ownRows = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, user.id), isNull(tasks.deletedAt)));

    const assignedRows = await db
      .select({ task: tasks })
      .from(taskAssignees)
      .innerJoin(tasks, eq(tasks.id, taskAssignees.taskId))
      .where(and(eq(taskAssignees.userId, user.id), eq(taskAssignees.status, 'active'), isNull(tasks.deletedAt)));

    let all = [
      ...ownRows.map((t) => ({ ...t, isOwner: true })),
      ...assignedRows.map((r) => ({ ...r.task, isOwner: false })),
    ];
    if (status) all = all.filter((t) => t.status === status);
    if (priority) all = all.filter((t) => t.priority === priority);
    all.sort((a, b) => (a.status === b.status ? +b.createdAt - +a.createdAt : a.status.localeCompare(b.status)));

    const taskIds = all.map((t) => t.id);
    const assigneesOut: Record<string, { id: string; name: string; avatar: string | null }[]> = {};
    if (taskIds.length) {
      const activeAssignees = await db
        .select({ assignee: taskAssignees, u: users })
        .from(taskAssignees)
        .innerJoin(users, eq(users.id, taskAssignees.userId))
        .where(and(inArray(taskAssignees.taskId, taskIds), eq(taskAssignees.status, 'active')));
      for (const a of activeAssignees) {
        (assigneesOut[a.assignee.taskId] ??= []).push({ id: a.u.id, name: a.u.name, avatar: a.u.avatar });
      }
    }

    res.json(all.map((t) => ({ ...t, assignees: assigneesOut[t.id] })));
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
    res.status(201).json({ ...row, isOwner: true });
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

// GET /api/tasks/invites — asignaciones a tareas compartidas, pendientes para mí.
router.get(
  '/invites',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const rows = await db
      .select({ assignee: taskAssignees, task: tasks, inviter: users })
      .from(taskAssignees)
      .innerJoin(tasks, eq(tasks.id, taskAssignees.taskId))
      .innerJoin(users, eq(users.id, taskAssignees.invitedBy))
      .where(and(eq(taskAssignees.userId, user.id), eq(taskAssignees.status, 'invited')));

    res.json(
      rows.map((r) => ({
        id: r.assignee.id,
        task: { id: r.task.id, title: r.task.title },
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
      .update(taskAssignees)
      .set({ status: 'active', respondedAt: new Date() })
      .where(
        and(eq(taskAssignees.id, req.params.id), eq(taskAssignees.userId, user.id), eq(taskAssignees.status, 'invited')),
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
      .delete(taskAssignees)
      .where(
        and(eq(taskAssignees.id, req.params.id), eq(taskAssignees.userId, user.id), eq(taskAssignees.status, 'invited')),
      )
      .returning();
    if (!row) throw notFound('Invitación no encontrada');
    res.json({ ok: true });
  }),
);

const assignSchema = z.object({ friendId: z.string().uuid() });

// POST /api/tasks/:id/assign — el dueño asigna a un amigo a esta tarea.
router.post(
  '/:id/assign',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { friendId } = validate(assignSchema, req.body);

    const [task] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, req.params.id), eq(tasks.userId, user.id), isNull(tasks.deletedAt)))
      .limit(1);
    if (!task) throw notFound('Task not found');
    if (friendId === user.id) throw badRequest('No puedes asignarte a ti mismo');

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
    if (!friendship) throw badRequest('Solo puedes asignar a tus amigos');

    const [existing] = await db
      .select({ status: taskAssignees.status })
      .from(taskAssignees)
      .where(and(eq(taskAssignees.taskId, task.id), eq(taskAssignees.userId, friendId)))
      .limit(1);
    if (existing) {
      throw badRequest(existing.status === 'active' ? 'Ya está asignado a esta tarea' : 'Ya tiene una invitación pendiente');
    }

    const [row] = await db
      .insert(taskAssignees)
      .values({ taskId: task.id, userId: friendId, invitedBy: user.id })
      .returning();
    res.status(201).json({ id: row.id });
  }),
);

// DELETE /api/tasks/:id/assignees/:memberId — el dueño quita a alguien, o un
// asignado se sale él mismo.
router.delete(
  '/:id/assignees/:memberId',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [task] = await db
      .select({ userId: tasks.userId })
      .from(tasks)
      .where(and(eq(tasks.id, req.params.id), isNull(tasks.deletedAt)))
      .limit(1);
    if (!task) throw notFound('Task not found');

    const isOwner = task.userId === user.id;
    const isSelf = req.params.memberId === user.id;
    if (!isOwner && !isSelf) throw forbidden();

    const [row] = await db
      .delete(taskAssignees)
      .where(and(eq(taskAssignees.taskId, req.params.id), eq(taskAssignees.userId, req.params.memberId)))
      .returning();
    if (!row) throw notFound('Asignado no encontrado');
    res.json({ ok: true });
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

    const [task] = await db
      .select({ userId: tasks.userId })
      .from(tasks)
      .where(and(eq(tasks.id, req.params.id), isNull(tasks.deletedAt)))
      .limit(1);
    if (!task) throw notFound('Task not found');

    if (task.userId !== user.id) {
      const [membership] = await db
        .select({ id: taskAssignees.id })
        .from(taskAssignees)
        .where(
          and(
            eq(taskAssignees.taskId, req.params.id),
            eq(taskAssignees.userId, user.id),
            eq(taskAssignees.status, 'active'),
          ),
        )
        .limit(1);
      if (!membership) throw notFound('Task not found');
    }

    const [row] = await db
      .update(tasks)
      .set({ status, completedAt: status === 'done' ? new Date() : null })
      .where(eq(tasks.id, req.params.id))
      .returning();
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
