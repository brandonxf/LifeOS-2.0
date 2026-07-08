import { Router } from 'express';
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db';
import { users, sessions } from '../db/schema';
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  generateRefreshToken,
  refreshTokenExpiry,
} from '../lib/auth';
import { asyncHandler, badRequest, unauthorized, validate } from '../lib/http';
import { authMiddleware, currentUser } from '../middleware/auth';

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

export default router;
