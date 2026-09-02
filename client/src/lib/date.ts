/** Colombia es UTC-5 todo el año (sin horario de verano), así que un offset
 *  fijo es exacto — no hace falta Intl/tz-database para esto. */
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Fecha "YYYY-MM-DD" tal como se ve en hora de Colombia en este instante,
 *  sin importar la zona horaria del dispositivo/navegador. Los "días" de
 *  hábitos (check-offs, rachas, heatmap, widget) siempre deben anclarse a
 *  esto — nunca a `new Date().toISOString()`, que es UTC y adelanta el
 *  cambio de día 5 horas (7pm hora Colombia en vez de medianoche). */
export function bogotaISODate(d: Date | number = new Date()): string {
  const t = typeof d === 'number' ? d : d.getTime();
  return new Date(t - BOGOTA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Suma (o resta) `deltaDays` a una fecha "YYYY-MM-DD", operando en UTC
 *  puro — evita Date#getDate/setDate, que usan la zona horaria local del
 *  dispositivo y podrían desalinear el resultado de `bogotaISODate`. */
export function shiftIsoDate(iso: string, deltaDays: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}
