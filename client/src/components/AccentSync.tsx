import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ACCENTS, type AccentKey } from '../lib/accents';
import { deriveAccentShades } from '../lib/color';
import { useAuth, type AuthUser } from '../store/auth';
import { useSettings } from '../store/settings';

/** Inyecta un color personalizado como variables CSS en `<html>`.
 *  Ojo: nunca llamar a esto en cada frame de un gesto (arrastre, etc) — en
 *  móvil, cambiar una custom property en <html> obliga a recalcular el
 *  estilo de toda la app, incluido el fondo `background-attachment: fixed`
 *  de index.css que depende de `--primary`. Por eso el picker de la rueda
 *  de color solo llama a esto una vez, al soltar. */
export function applyCustomAccentPreview(hex: string) {
  const shades = deriveAccentShades(hex);
  const root = document.documentElement.style;
  root.setProperty('--primary', shades.primary);
  root.setProperty('--primary-200', shades.primary200);
  root.setProperty('--primary-400', shades.primary400);
  root.setProperty('--primary-600', shades.primary600);
}

const isAccentKey = (v: string | null | undefined): v is AccentKey =>
  ACCENTS.some((a) => a.key === v);

/** Guarda el acento en la cuenta para que los demás dispositivos lo reciban
 *  (ver AccentSync). Se llama solo desde las acciones del usuario en
 *  Ajustes, nunca al aplicar un valor que vino del servidor: así no hay
 *  ciclos. Si falla (sin red) el cambio queda solo en este dispositivo. */
export async function pushAccent(patch: { accent?: AccentKey; customAccentHex?: string | null }) {
  try {
    const res = await api<{ user: AuthUser }>('/api/auth/me', { method: 'PATCH', body: patch });
    useAuth.getState().setUser(res.user);
  } catch {
    /* ignore */
  }
}

/** Aplica el acento elegido al `<html>` como `data-accent`, para que las
 *  variables CSS de index.css (que alimentan `primary` en Tailwind)
 *  cambien en toda la app. Si hay un color personalizado (rueda de color),
 *  sus tonos derivados se inyectan como estilos inline en `<html>`, que
 *  siempre ganan sobre la regla `[data-accent]` de la hoja de estilos sin
 *  necesidad de tocarla.
 *
 *  También sincroniza el acento entre dispositivos: refresca el perfil
 *  (`/api/auth/me`) al abrir la app y al volver a ella, y si el servidor
 *  tiene un acento lo copia al store local (gana el del servidor). Si el
 *  servidor aún no tiene ninguno pero este dispositivo ya tenía uno
 *  elegido, lo sube una vez para no perderlo. No renderiza nada. */
export function AccentSync() {
  const accent = useSettings((s) => s.accent);
  const customAccentHex = useSettings((s) => s.customAccentHex);
  const loggedIn = useAuth((s) => !!s.user && !!s.accessToken);
  const serverAccent = useAuth((s) => s.user?.accent ?? null);
  const serverCustom = useAuth((s) => s.user?.customAccentHex ?? null);

  // Refresca el perfil: al abrir la app y cada vez que vuelve a primer plano.
  const me = useQuery({
    queryKey: ['me-accent'],
    enabled: loggedIn,
    staleTime: 0,
    queryFn: async () => {
      const res = await api<{ user: AuthUser }>('/api/auth/me');
      useAuth.getState().setUser(res.user);
      return res.user;
    },
  });
  const { refetch } = me;
  useEffect(() => {
    if (!loggedIn) return;
    function onVisible() {
      if (document.visibilityState === 'visible') refetch();
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [loggedIn, refetch]);

  // Servidor -> local. Solo corre cuando cambia el valor del servidor.
  useEffect(() => {
    if (!loggedIn) return;
    const local = useSettings.getState();
    if (isAccentKey(serverAccent) || serverCustom) {
      const nextAccent = isAccentKey(serverAccent) ? serverAccent : local.accent;
      if (local.accent !== nextAccent || local.customAccentHex !== serverCustom) {
        useSettings.setState({ accent: nextAccent, customAccentHex: serverCustom });
      }
    } else if (local.accent !== 'lime' || local.customAccentHex) {
      // El servidor no tiene acento y este dispositivo sí: súbelo una vez.
      pushAccent({ accent: local.accent, customAccentHex: local.customAccentHex });
    }
  }, [loggedIn, serverAccent, serverCustom]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;

    if (customAccentHex) {
      applyCustomAccentPreview(customAccentHex);
    } else {
      const root = document.documentElement.style;
      root.removeProperty('--primary');
      root.removeProperty('--primary-200');
      root.removeProperty('--primary-400');
      root.removeProperty('--primary-600');
    }
  }, [accent, customAccentHex]);

  return null;
}
