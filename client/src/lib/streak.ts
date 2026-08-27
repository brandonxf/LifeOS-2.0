import { subDays } from 'date-fns';

/** Racha actual (días consecutivos hasta hoy) a partir de logs "YYYY-MM-DD". */
export function currentStreak(logs: string[]): number {
  const set = new Set(logs);
  let count = 0;
  let cursor = new Date();
  if (!set.has(cursor.toISOString().slice(0, 10))) cursor = subDays(cursor, 1);
  while (set.has(cursor.toISOString().slice(0, 10))) {
    count++;
    cursor = subDays(cursor, 1);
  }
  return count;
}
