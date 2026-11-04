/**
 * The only module that touches persistence. Phase 1 uses localStorage;
 * phase 2 replaces these functions with Firestore calls behind the same API.
 * Screens must never call storage directly; they go through the hooks.
 */
import { dayDocId } from '../date/dayKey';
import type { DayRecord, Routine } from './types';

const PREFIX = 'fwc:';

function read<T>(key: string): T | undefined {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

/** Async so callers already treat writes as fallible, as they will be with Firestore. */
async function write(key: string, value: unknown): Promise<void> {
  window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export function loadRoutine(routineId: string): Routine | undefined {
  return read<Routine>(`routines/${routineId}`);
}

export function saveRoutine(routine: Routine): Promise<void> {
  return write(`routines/${routine.id}`, routine);
}

export function loadDay(key: string, personId: string): DayRecord {
  return read<DayRecord>(`days/${dayDocId(key, personId)}`) ?? { doneStepIds: [] };
}

export function saveDay(key: string, personId: string, record: DayRecord): Promise<void> {
  return write(`days/${dayDocId(key, personId)}`, record);
}
