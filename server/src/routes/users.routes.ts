import { Router } from 'express';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';
import { asyncHandler, notFound } from '../lib/http.js';

const router = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/users/:id/avatar — sirve la foto de perfil como imagen.
 *
 * Va montado ANTES del `authMiddleware` global a propósito: un `<img>` no
 * puede mandar el header `Authorization`, así que la foto tiene que ser
 * legible sin token (como en cualquier CDN de avatares). Solo expone la
 * imagen, y hace falta conocer el UUID del usuario para pedirla.
 */
router.get(
  '/:id/avatar',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!UUID_RE.test(id)) throw notFound('Avatar not found');

    const [row] = await db
      .select({ data: users.avatarData, mime: users.avatarMime, updatedAt: users.avatarUpdatedAt })
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);

    if (!row?.data) throw notFound('Avatar not found');

    const buf = Buffer.from(row.data, 'base64');
    const etag = `"${id}-${row.updatedAt?.getTime() ?? 0}"`;

    // La URL lleva `?v=<timestamp>`, así que cada versión es inmutable: el
    // navegador la baja una sola vez aunque aparezca en 50 ítems del feed.
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Content-Type', row.mime ?? 'image/jpeg');
    res.setHeader('ETag', etag);

    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    res.setHeader('Content-Length', String(buf.length));
    res.end(buf);
  }),
);

export default router;
