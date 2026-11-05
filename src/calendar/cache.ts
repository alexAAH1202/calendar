import type { CalEvent } from './types';

const KEY = 'fwc:calendarCache';

export interface EventCache {
  events: CalEvent[];
  fetchedAt: number;
  /** Which calendars the cache was fetched for. */
  calendarIds: string;
}

/** The last events fetched, kept on this device so the wall shows them offline or after a restart. */
export function readCache(): EventCache | undefined {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as EventCache) : undefined;
  } catch {
    return undefined;
  }
}

export function writeCache(cache: EventCache): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage full or blocked: events still show until the next reload */
  }
}
