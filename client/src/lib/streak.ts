import { bogotaISODate, shiftIsoDate } from './date';

/** Racha actual (días consecutivos hasta hoy, hora Colombia) a partir de
 *  logs "YYYY-MM-DD". */
export function currentStreak(logs: string[]): number {
  const set = new Set(logs);
  let count = 0;
  let cursor = bogotaISODate();
  if (!set.has(cursor)) cursor = shiftIsoDate(cursor, -1);
  while (set.has(cursor)) {
    count++;
    cursor = shiftIsoDate(cursor, -1);
  }
  return count;
}
