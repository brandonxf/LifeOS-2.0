import { Router } from 'express';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, sessions } from '../db/schema/index.js';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  generateRefreshToken,
  refreshTokenExpiry,
} from '../lib/auth.js';
import { asyncHandler, badRequest, unauthorized, validate } from '../lib/http.js';
import { authMiddleware, currentUser } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(120),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const updateProfileSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    email: z.string().email().optional(),
    // URL de avatar o null para quitarlo. Cadena vacía se trata como null.
    avatar: z.string().url().max(2048).nullish().or(z.literal('')),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

function publicUser(u: typeof users.$inferSelect) {
  const { passwordHash, deletedAt, ...rest } = u;
  return rest;
}

async function issueSession(userId: string, email: string, userAgent?: string) {
  const accessToken = signAccessToken({ sub: userId, email });
  const refreshToken = generateRefreshToken();
  await db.insert(sessions).values({
    userId,
    refreshToken,
    userAgent: userAgent ?? null,
    expiresAt: refreshTokenExpiry(),
  });
  return { accessToken, refreshToken };
}

// POST /api/auth/register
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const body = validate(registerSchema, req.body);

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email.toLowerCase()))
      .limit(1);
    if (existing.length) throw badRequest('An account with that email already exists');

    const passwordHash = await hashPassword(body.password);
    const [user] = await db
      .insert(users)
      .values({ email: body.email.toLowerCase(), passwordHash, name: body.name })
      .returning();

    const tokens = await issueSession(user.id, user.email, req.headers['user-agent']);
    res.status(201).json({ user: publicUser(user), ...tokens });
  }),
);

// POST /api/auth/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = validate(loginSchema, req.body);
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, body.email.toLowerCase()), isNull(users.deletedAt)))
      .limit(1);

    if (!user) throw unauthorized('Invalid email or password');
    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) throw unauthorized('Invalid email or password');

    const tokens = await issueSession(user.id, user.email, req.headers['user-agent']);
    res.json({ user: publicUser(user), ...tokens });
  }),
);

// POST /api/auth/refresh — rotates the refresh token
router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const body = validate(refreshSchema, req.body);
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.refreshToken, body.refreshToken))
      .limit(1);

    if (!session) throw unauthorized('Invalid refresh token');
    if (session.expiresAt < new Date()) {
      await db.delete(sessions).where(eq(sessions.id, session.id));
      throw unauthorized('Refresh token expired');
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, session.userId), isNull(users.deletedAt)))
      .limit(1);
    if (!user) throw unauthorized('User no longer exists');

    // Rotate: delete old, issue new.
    await db.delete(sessions).where(eq(sessions.id, session.id));
    const tokens = await issueSession(user.id, user.email, req.headers['user-agent']);
    res.json({ user: publicUser(user), ...tokens });
  }),
);

// POST /api/auth/logout
router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = req.body?.refreshToken;
    if (token) await db.delete(sessions).where(eq(sessions.refreshToken, token));
    res.json({ ok: true });
  }),
);

// GET /api/auth/me
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    res.json({ user: publicUser(user) });
  }),
);

// PATCH /api/auth/me — update name / email / avatar
router.patch(
  '/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(updateProfileSchema, req.body);

    const updates: Partial<typeof users.$inferInsert> = {};

    if (body.name !== undefined) updates.name = body.name;

    if (body.email !== undefined) {
      const email = body.email.toLowerCase();
      if (email !== user.email) {
        const existing = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (existing.length) throw badRequest('An account with that email already exists');
      }
      updates.email = email;
    }

    // avatar: '' o null limpian el campo; una URL lo asigna.
    if (body.avatar !== undefined) updates.avatar = body.avatar ? body.avatar : null;

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, user.id))
      .returning();

    res.json({ user: publicUser(updated) });
  }),
);

// POST /api/auth/change-password — verify current, set new, revoke other sessions
router.post(
  '/change-password',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(changePasswordSchema, req.body);

    const ok = await verifyPassword(body.currentPassword, user.passwordHash);
    if (!ok) throw badRequest('Current password is incorrect');

    const passwordHash = await hashPassword(body.newPassword);
    await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));

    // Seguridad: invalida todas las sesiones (fuerza re-login en todos los dispositivos).
    await db.delete(sessions).where(eq(sessions.userId, user.id));

    res.json({ ok: true });
  }),
);

export default router;
