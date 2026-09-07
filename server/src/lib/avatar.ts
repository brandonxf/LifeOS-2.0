/**
 * Fotos de perfil subidas desde la galería/cámara.
 *
 * El cliente manda la imagen ya recortada y comprimida como data URI. Aquí se
 * valida, se parte en (mime, base64) para guardarla en `users.avatar_data`, y
 * se arma la URL corta que va en `users.avatar` — que es lo único que viaja en
 * las respuestas JSON (feed, amigos, miembros de un hábito, asignados de una
 * tarea…). Servir la imagen aparte evita repetir ~30 KB de base64 en cada uno
 * de los 50 ítems del feed.
 */

/** Tope del lado del servidor. El cliente exporta ~256px/40 KB; este margen
 *  solo existe para frenar un payload absurdo, no para el uso normal. */
export const AVATAR_MAX_BYTES = 1024 * 1024;

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Prefijo de las URLs que sirve este mismo backend. */
export const AVATAR_PATH_PREFIX = '/api/users/';

export interface ParsedAvatar {
  mime: string;
  base64: string;
  bytes: number;
}

/** Parsea `data:image/jpeg;base64,…`. Devuelve null si no es una imagen
 *  soportada o si el base64 está mal formado. */
export function parseAvatarDataUri(value: string): ParsedAvatar | null {
  const match = /^data:([a-z/+.-]+);base64,(.+)$/is.exec(value.trim());
  if (!match) return null;

  const mime = match[1].toLowerCase();
  if (!ALLOWED_MIME.includes(mime as (typeof ALLOWED_MIME)[number])) return null;

  const base64 = match[2].replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return null;

  const buf = Buffer.from(base64, 'base64');
  // Round-trip: descarta base64 truncado que Buffer aceptaría en silencio.
  if (!buf.length || buf.toString('base64') !== base64) return null;

  return { mime, base64, bytes: buf.length };
}

/** URL pública versionada de la foto de un usuario. El `?v=` cambia en cada
 *  subida para invalidar el caché inmutable del navegador. */
export function avatarUrl(userId: string, updatedAt: Date): string {
  return `${AVATAR_PATH_PREFIX}${userId}/avatar?v=${updatedAt.getTime()}`;
}

/** ¿Es una URL que ya apunta a nuestro endpoint? (el cliente reenvía el valor
 *  actual sin tocarlo cuando el usuario no cambió la foto). */
export function isOwnAvatarUrl(value: string): boolean {
  return value.startsWith(AVATAR_PATH_PREFIX);
}
