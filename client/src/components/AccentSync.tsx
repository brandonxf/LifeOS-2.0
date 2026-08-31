import { useEffect } from 'react';
import { useSettings } from '../store/settings';

/** Aplica el acento elegido al `<html>` como `data-accent`, para que las
 *  variables CSS de index.css (que alimentan `primary` en Tailwind)
 *  cambien en toda la app. No renderiza nada. */
export function AccentSync() {
  const accent = useSettings((s) => s.accent);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  return null;
}
