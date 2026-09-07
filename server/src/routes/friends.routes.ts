import { Router } from 'express';
import { z } from 'zod';
import { and, eq, inArray, or } from 'drizzle-orm';
import { db } from '../db/index.js';
import { friendships, users, habits, habitMembers, tasks, taskAssignees } from '../db/schema/index.js';
import { asyncHandler, badRequest, notFound, validate } from '../lib/http.js';
import { currentUser } from '../middleware/auth.js';

const router = Router();

/**
 * Al dejar de ser amigos, se rompe cualquier colaboración cruzada entre
 * ambos: si uno invitó al otro a un hábito o tarea suya (aceptada o
 * pendiente), esa fila de `habit_members`/`task_assignees` se borra. Solo
 * afecta las filas donde uno es dueño y el otro colaborador — un hábito
 * compartido con un tercer amigo no se toca. Los logs/eventos de actividad
 * ya hechos no se borran (mismo criterio que el resto de la app: sobreviven
 * aunque el hábito/tarea o, en este caso, el vínculo desaparezca), pero al
 * perder la membresía dejan de ser visibles para cualquiera de los dos.
 */
async function unlinkSharedStuff(userA: string, userB: string) {
  const [habitsOfA, habitsOfB, tasksOfA, tasksOfB] = await Promise.all([
    db.select({ id: habits.id }).from(habits).where(eq(habits.userId, userA)),
    db.select({ id: habits.id }).from(habits).where(eq(habits.userId, userB)),
    db.select({ id: tasks.id }).from(tasks).where(eq(tasks.userId, userA)),
    db.select({ id: tasks.id }).from(tasks).where(eq(tasks.userId, userB)),
  ]);

  const habitIdsOfA = habitsOfA.map((h) => h.id);
  const habitIdsOfB = habitsOfB.map((h) => h.id);
  const taskIdsOfA = tasksOfA.map((t) => t.id);
  const taskIdsOfB = tasksOfB.map((t) => t.id);

  await Promise.all([
    habitIdsOfA.length
      ? db.delete(habitMembers).where(and(eq(habitMembers.userId, userB), inArray(habitMembers.habitId, habitIdsOfA)))
      : null,
    habitIdsOfB.length
      ? db.delete(habitMembers).where(and(eq(habitMembers.userId, userA), inArray(habitMembers.habitId, habitIdsOfB)))
      : null,
    taskIdsOfA.length
      ? db.delete(taskAssignees).where(and(eq(taskAssignees.userId, userB), inArray(taskAssignees.taskId, taskIdsOfA)))
      : null,
    taskIdsOfB.length
      ? db.delete(taskAssignees).where(and(eq(taskAssignees.userId, userA), inArray(taskAssignees.taskId, taskIdsOfB)))
      : null,
  ]);
}

function publicFriend(u: typeof users.$inferSelect) {
  return { id: u.id, name: u.name, avatar: u.avatar };
}

// GET /api/friends — mis amistades aceptadas.
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);

    // Dos consultas (yo como requester / yo como addressee) en vez de un JOIN
    // condicional: qué columna unir depende de cada fila, no se puede decidir
    // con un ternario de JS al construir la consulta.
    const asRequester = await db
      .select({ friendship: friendships, other: users })
      .from(friendships)
      .innerJoin(users, eq(users.id, friendships.addresseeId))
      .where(and(eq(friendships.status, 'accepted'), eq(friendships.requesterId, user.id)));

    const asAddressee = await db
      .select({ friendship: friendships, other: users })
      .from(friendships)
      .innerJoin(users, eq(users.id, friendships.requesterId))
      .where(and(eq(friendships.status, 'accepted'), eq(friendships.addresseeId, user.id)));

    res.json(
      [...asRequester, ...asAddressee].map((r) => ({
        id: r.friendship.id,
        since: r.friendship.respondedAt,
        friend: publicFriend(r.other),
      })),
    );
  }),
);

// GET /api/friends/requests — solicitudes pendientes entrantes y salientes.
router.get(
  '/requests',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);

    const incomingRows = await db
      .select({ friendship: friendships, other: users })
      .from(friendships)
      .innerJoin(users, eq(users.id, friendships.requesterId))
      .where(and(eq(friendships.status, 'pending'), eq(friendships.addresseeId, user.id)));

    const outgoingRows = await db
      .select({ friendship: friendships, other: users })
      .from(friendships)
      .innerJoin(users, eq(users.id, friendships.addresseeId))
      .where(and(eq(friendships.status, 'pending'), eq(friendships.requesterId, user.id)));

    res.json({
      incoming: incomingRows.map((r) => ({
        id: r.friendship.id,
        createdAt: r.friendship.createdAt,
        user: publicFriend(r.other),
      })),
      outgoing: outgoingRows.map((r) => ({
        id: r.friendship.id,
        createdAt: r.friendship.createdAt,
        user: publicFriend(r.other),
      })),
    });
  }),
);

const addSchema = z.object({ code: z.string().min(1).max(20) });

// POST /api/friends/add — envía una solicitud usando el código del otro.
router.post(
  '/add',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { code } = validate(addSchema, req.body);

    const [target] = await db
      .select()
      .from(users)
      .where(eq(users.friendCode, code.trim().toUpperCase()))
      .limit(1);
    if (!target) throw notFound('No existe ningún usuario con ese código');
    if (target.id === user.id) throw badRequest('Ese es tu propio código');

    const [existing] = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, user.id), eq(friendships.addresseeId, target.id)),
          and(eq(friendships.requesterId, target.id), eq(friendships.addresseeId, user.id)),
        ),
      )
      .limit(1);
    if (existing) {
      throw badRequest(
        existing.status === 'accepted' ? 'Ya son amigos' : 'Ya hay una solicitud pendiente con esta persona',
      );
    }

    const [row] = await db
      .insert(friendships)
      .values({ requesterId: user.id, addresseeId: target.id })
      .returning();
    res.status(201).json({ id: row.id, createdAt: row.createdAt, user: publicFriend(target) });
  }),
);

// POST /api/friends/requests/:id/accept
router.post(
  '/requests/:id/accept',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [row] = await db
      .update(friendships)
      .set({ status: 'accepted', respondedAt: new Date() })
      .where(
        and(
          eq(friendships.id, req.params.id),
          eq(friendships.addresseeId, user.id),
          eq(friendships.status, 'pending'),
        ),
      )
      .returning();
    if (!row) throw notFound('Solicitud no encontrada');
    res.json({ ok: true });
  }),
);

// POST /api/friends/requests/:id/reject
router.post(
  '/requests/:id/reject',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [row] = await db
      .delete(friendships)
      .where(
        and(
          eq(friendships.id, req.params.id),
          eq(friendships.addresseeId, user.id),
          eq(friendships.status, 'pending'),
        ),
      )
      .returning();
    if (!row) throw notFound('Solicitud no encontrada');
    res.json({ ok: true });
  }),
);

// DELETE /api/friends/:id — elimina una amistad aceptada o cancela una solicitud enviada.
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [row] = await db
      .delete(friendships)
      .where(
        and(
          eq(friendships.id, req.params.id),
          or(eq(friendships.requesterId, user.id), eq(friendships.addresseeId, user.id)),
        ),
      )
      .returning();
    if (!row) throw notFound('No encontrado');

    // Si ya eran amigos (no solo una solicitud cancelada/rechazada), desarma
    // todo lo que tenían juntos: hábitos y tareas compartidas entre ambos.
    if (row.status === 'accepted') {
      const otherId = row.requesterId === user.id ? row.addresseeId : row.requesterId;
      await unlinkSharedStuff(user.id, otherId);
    }

    res.json({ ok: true });
  }),
);

export default router;
