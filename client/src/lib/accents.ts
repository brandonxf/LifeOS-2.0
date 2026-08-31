/** Acentos de color disponibles para personalizar la app. `swatch` es lo
 *  que se pinta en el selector de Ajustes; los valores reales que se
 *  aplican viven como variables CSS en index.css (bloques `[data-accent]`),
 *  para que todo lo que usa `primary`/`primary-200/400/600` en Tailwind
 *  reaccione sin tocar cada componente. */
export const ACCENTS = [
  { key: 'lime', label: 'Lima', swatch: '#37e779' },
  { key: 'sky', label: 'Azul', swatch: '#38bdf8' },
  { key: 'violet', label: 'Violeta', swatch: '#a78bfa' },
  { key: 'orange', label: 'Naranja', swatch: '#fb923c' },
  { key: 'pink', label: 'Rosa', swatch: '#f472b6' },
] as const;

export type AccentKey = (typeof ACCENTS)[number]['key'];
