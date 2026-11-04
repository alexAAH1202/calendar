import { format } from 'date-fns';

/** Local-time date key, e.g. "2026-11-05". Completion is stored per key, so midnight needs no reset write. */
export function dayKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

/** Storage id for one person's completion on one date: "{yyyy-mm-dd}_{pid}". */
export function dayDocId(key: string, personId: string): string {
  return `${key}_${personId}`;
}
