import { useEffect } from 'react';
import { useSettings } from '../store/settings';
import { deriveAccentShades } from '../lib/color';

/** Aplica el acento elegido al `<html>` como `data-accent`, para que las
 *  variables CSS de index.css (que alimentan `primary` en Tailwind)
 *  cambien en toda la app. Si hay un color personalizado (rueda de color),
 *  sus tonos derivados se inyectan como estilos inline en `<html>`, que
 *  siempre ganan sobre la regla `[data-accent]` de la hoja de estilos sin
 *  necesidad de tocarla. No renderiza nada. */
export function AccentSync() {
  const accent = useSettings((s) => s.accent);
  const customAccentHex = useSettings((s) => s.customAccentHex);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;

    const root = document.documentElement.style;
    if (customAccentHex) {
      const shades = deriveAccentShades(customAccentHex);
      root.setProperty('--primary', shades.primary);
      root.setProperty('--primary-200', shades.primary200);
      root.setProperty('--primary-400', shades.primary400);
      root.setProperty('--primary-600', shades.primary600);
    } else {
      root.removeProperty('--primary');
      root.removeProperty('--primary-200');
      root.removeProperty('--primary-400');
      root.removeProperty('--primary-600');
    }
  }, [accent, customAccentHex]);

  return null;
}
