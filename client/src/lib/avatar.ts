import { API_BASE } from './api';

/**
 * Resuelve el `avatar` que devuelve el API a algo que un <img> pueda cargar.
 *
 * Las fotos subidas se guardan como una ruta relativa de nuestro API
 * (`/api/users/:id/avatar?v=…`). En la web eso funciona tal cual, pero el APK
 * sirve el bundle desde `https://localhost`, así que ahí hay que anteponer la
 * URL absoluta del API. Las URLs externas y los data URIs pasan intactos.
 */
export function avatarSrc(avatar: string | null | undefined): string | undefined {
  if (!avatar) return undefined;
  if (/^(https?:|data:|blob:)/i.test(avatar)) return avatar;
  return `${API_BASE}${avatar}`;
}
