import { useEffect } from 'react';
import { useSettings } from '../store/settings';
import { deriveAccentShades } from '../lib/color';

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
