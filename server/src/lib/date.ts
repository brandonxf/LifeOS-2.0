/** Colombia es UTC-5 todo el año (sin horario de verano), así que un offset
 *  fijo es exacto — no hace falta Intl/tz-database para esto. */
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;

/** Fecha "YYYY-MM-DD" tal como se ve en hora de Colombia en este instante,
 *  sin importar la zona horaria del proceso del servidor (Vercel corre en
 *  UTC). Los "días" de hábitos (check-offs, rachas) siempre deben anclarse
 *  a esto — nunca a `new Date().toISOString()`, que es UTC y adelanta el
 *  cambio de día 5 horas (7pm hora Colombia en vez de medianoche). */
export function bogotaISODate(d: Date = new Date()): string {
  return new Date(d.getTime() - BOGOTA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Suma (o resta) `deltaDays` a una fecha "YYYY-MM-DD", operando en UTC
 *  puro — evita Date#getDate/setDate, que usan la zona horaria local del
 *  proceso y podrían desalinear el resultado de `bogotaISODate`. */
export function shiftIsoDate(iso: string, deltaDays: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

/** Racha actual (días consecutivos hasta hoy, u hoy sin contar si aún no se
 *  marcó) a partir de un set de fechas "YYYY-MM-DD" marcadas. Usado tanto
 *  para el propio hábito (habits.routes.ts) como para lo que un amigo
 *  muestra en su perfil (friends.routes.ts). */
export function currentStreakFromDates(dates: Set<string>): number {
  let current = 0;
  let cursor = bogotaISODate();
  if (!dates.has(cursor)) cursor = shiftIsoDate(cursor, -1);
  while (dates.has(cursor)) {
    current++;
    cursor = shiftIsoDate(cursor, -1);
  }
  return current;
}
