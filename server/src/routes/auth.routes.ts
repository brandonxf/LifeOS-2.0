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
  generateFriendCode,
  generateResetToken,
  resetTokenExpiry,
  hashResetToken,
} from '../lib/auth.js';
import { asyncHandler, badRequest, unauthorized, validate } from '../lib/http.js';
import { authMiddleware, currentUser } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimit.js';
import {
  AVATAR_MAX_BYTES,
  avatarUrl,
  isOwnAvatarUrl,
  parseAvatarDataUri,
} from '../lib/avatar.js';
import { sendPasswordResetEmail } from '../services/email.service.js';
import { env } from '../config/env.js';

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

// Texto opcional que se puede limpiar: acepta string, null o '' (se guarda null).
const optionalText = (max: number) => z.string().max(max).nullish().or(z.literal(''));

const updateProfileSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    email: z.string().email().optional(),
    // Foto de perfil. Acepta un data URI (imagen recién subida desde la
    // galería/cámara), una URL http(s) externa, la propia URL que ya tiene
    // el usuario, o ''/null para quitarla. El tamaño real se valida abajo,
    // no aquí, para poder dar un mensaje entendible.
    avatar: z.string().max(3_000_000).nullish().or(z.literal('')),
    // Handle: 3-30 chars, letras/números/guion bajo. '' o null lo limpian.
    username: z
      .string()
      .regex(/^[a-zA-Z0-9_]{3,30}$/, 'Solo letras, números y guion bajo (3-30)')
      .nullish()
      .or(z.literal('')),
    bio: optionalText(500),
    // Fecha ISO YYYY-MM-DD, o '' / null para limpiar.
    birthDate: z.string().date().nullish().or(z.literal('')),
    location: optionalText(120),
    phone: optionalText(40),
    pronouns: optionalText(40),
    // Mismas claves que ACCENTS en client/src/lib/accents.ts.
    accent: z.enum(['lime', 'sky', 'violet', 'orange', 'pink']).nullish(),
    customAccentHex: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Color no válido')
      .nullish(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// PIN numérico de exactamente 4 dígitos (ver PinInput.tsx en el cliente).
const diaryPin = () => z.string().regex(/^\d{4}$/, 'El PIN debe ser de 4 dígitos');

const setDiaryPinSchema = z.object({
  pin: diaryPin(),
  // Solo se exige si ya había un PIN puesto (para cambiarlo hay que saber el actual).
  currentPin: diaryPin().optional(),
});

const verifyDiaryPinSchema = z.object({
  pin: z.string().min(1),
});

const disableDiaryPinSchema = z.object({
  pin: diaryPin(),
});

function publicUser(u: typeof users.$inferSelect) {
  // avatarData/avatarMime nunca salen en JSON: la foto se sirve por
  // GET /api/users/:id/avatar (ver lib/avatar.ts). diaryPinHash tampoco:
  // solo se expone como el booleano diaryLockEnabled.
  const { passwordHash, deletedAt, avatarData, avatarMime, avatarUpdatedAt, diaryPinHash, ...rest } = u;
  return { ...rest, diaryLockEnabled: !!diaryPinHash };
}

async function uniqueFriendCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateFriendCode();
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.friendCode, code))
      .limit(1);
    if (!existing.length) return code;
  }
  throw new Error('Could not generate a unique friend code');
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
    const friendCode = await uniqueFriendCode();
    const [user] = await db
      .insert(users)
      .values({ email: body.email.toLowerCase(), passwordHash, name: body.name, friendCode })
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

// POST /api/auth/forgot-password — siempre responde ok (no revela si el correo existe).
// Rate limit propio y más estricto que el general de /api/auth: es la ruta
// que manda correos, así que abusarla tiene un costo real (spam a terceros).
router.post(
  '/forgot-password',
  rateLimiter(5, 15 * 60),
  asyncHandler(async (req, res) => {
    const body = validate(forgotPasswordSchema, req.body);

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.email, body.email.toLowerCase()), isNull(users.deletedAt)))
      .limit(1);

    if (user) {
      const token = generateResetToken();
      await db
        .update(users)
        .set({ resetTokenHash: hashResetToken(token), resetTokenExpiresAt: resetTokenExpiry() })
        .where(eq(users.id, user.id));

      const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
      // No se espera (await) adrede: que un correo lento no retrase la
      // respuesta genérica, que debe salir igual de rápido exista o no la cuenta.
      void sendPasswordResetEmail(user.email, resetUrl);
    }

    res.json({ ok: true });
  }),
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  rateLimiter(10, 15 * 60),
  asyncHandler(async (req, res) => {
    const body = validate(resetPasswordSchema, req.body);
    const tokenHash = hashResetToken(body.token);

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.resetTokenHash, tokenHash), isNull(users.deletedAt)))
      .limit(1);

    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      throw badRequest('Ese link ya no es válido. Pide uno nuevo.');
    }

    const passwordHash = await hashPassword(body.newPassword);
    await db
      .update(users)
      .set({ passwordHash, resetTokenHash: null, resetTokenExpiresAt: null })
      .where(eq(users.id, user.id));

    // Igual que change-password: fuera de todas las sesiones activas.
    await db.delete(sessions).where(eq(sessions.userId, user.id));

    res.json({ ok: true });
  }),
);

// GET /api/auth/me
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    let user = currentUser(req);
    // Cuentas creadas antes de que existiera el sistema de amigos no tienen
    // código aún — se genera perezosamente la primera vez que se pide /me.
    if (!user.friendCode) {
      const friendCode = await uniqueFriendCode();
      [user] = await db.update(users).set({ friendCode }).where(eq(users.id, user.id)).returning();
    }
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

    if (body.username !== undefined) {
      const username = body.username ? body.username.toLowerCase() : null;
      if (username && username !== user.username) {
        const existing = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, username))
          .limit(1);
        if (existing.length) throw badRequest('Ese nombre de usuario ya está en uso');
      }
      updates.username = username;
    }

    if (body.avatar !== undefined) {
      const raw = (body.avatar ?? '').trim();
      if (!raw) {
        // Quitar la foto: borra también los bytes guardados.
        updates.avatar = null;
        updates.avatarData = null;
        updates.avatarMime = null;
        updates.avatarUpdatedAt = null;
      } else if (raw.startsWith('data:')) {
        const parsed = parseAvatarDataUri(raw);
        if (!parsed) throw badRequest('Esa imagen no sirve como foto de perfil (usa JPG, PNG o WEBP)');
        if (parsed.bytes > AVATAR_MAX_BYTES) {
          throw badRequest('La imagen pesa demasiado. Recorta o reduce el zoom e inténtalo de nuevo');
        }
        const now = new Date();
        updates.avatarData = parsed.base64;
        updates.avatarMime = parsed.mime;
        updates.avatarUpdatedAt = now;
        updates.avatar = avatarUrl(user.id, now);
      } else if (isOwnAvatarUrl(raw)) {
        // El cliente reenvió la URL que ya tenía: no se toca nada.
      } else if (/^https?:\/\//i.test(raw) && raw.length <= 2048) {
        // Sigue valiendo una URL externa (avatares de cuentas viejas).
        updates.avatar = raw;
        updates.avatarData = null;
        updates.avatarMime = null;
        updates.avatarUpdatedAt = null;
      } else {
        throw badRequest('Avatar no válido');
      }
    }
    // Texto opcional: '' o null limpian el campo.
    if (body.bio !== undefined) updates.bio = body.bio ? body.bio : null;
    if (body.birthDate !== undefined) updates.birthDate = body.birthDate ? body.birthDate : null;
    if (body.location !== undefined) updates.location = body.location ? body.location : null;
    if (body.phone !== undefined) updates.phone = body.phone ? body.phone : null;
    if (body.pronouns !== undefined) updates.pronouns = body.pronouns ? body.pronouns : null;
    if (body.accent !== undefined) updates.accent = body.accent ?? null;
    if (body.customAccentHex !== undefined) updates.customAccentHex = body.customAccentHex ?? null;

    // Puede quedar vacío si lo único que llegó fue el avatar que ya tenía:
    // `.set({})` sería un UPDATE inválido.
    if (!Object.keys(updates).length) {
      res.json({ user: publicUser(user) });
      return;
    }

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

// POST /api/auth/diary-pin — set (or change) the PIN that locks the Diary module
router.post(
  '/diary-pin',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(setDiaryPinSchema, req.body);

    if (user.diaryPinHash) {
      if (!body.currentPin) throw badRequest('Ingresa el PIN actual del diario');
      const ok = await verifyPassword(body.currentPin, user.diaryPinHash);
      if (!ok) throw badRequest('El PIN actual no es correcto');
    }

    const diaryPinHash = await hashPassword(body.pin);
    const [updated] = await db
      .update(users)
      .set({ diaryPinHash })
      .where(eq(users.id, user.id))
      .returning();

    res.json({ user: publicUser(updated) });
  }),
);

// POST /api/auth/diary-pin/disable — remove the Diary lock (requires the current PIN)
router.post(
  '/diary-pin/disable',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(disableDiaryPinSchema, req.body);

    if (!user.diaryPinHash) throw badRequest('El diario no tiene bloqueo activado');
    const ok = await verifyPassword(body.pin, user.diaryPinHash);
    if (!ok) throw badRequest('El PIN no es correcto');

    const [updated] = await db
      .update(users)
      .set({ diaryPinHash: null })
      .where(eq(users.id, user.id))
      .returning();

    res.json({ user: publicUser(updated) });
  }),
);

// POST /api/auth/diary-pin/verify — used by the Diary lock screen, not a session/token (ver DiaryLockGate.tsx)
router.post(
  '/diary-pin/verify',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(verifyDiaryPinSchema, req.body);

    if (!user.diaryPinHash) {
      res.json({ ok: true });
      return;
    }
    const ok = await verifyPassword(body.pin, user.diaryPinHash);
    res.json({ ok });
  }),
);

export default router;
