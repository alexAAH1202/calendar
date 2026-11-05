import { dayDocId } from '../date/dayKey';
import type { FamilyStore, RoutineSnapshot } from './store';
import type { DayRecord, Routine } from './types';

const PREFIX = 'fwc:';

type Listener = (key: string, local: boolean) => void;

/** Keeps everything in this browser's localStorage. Other tabs see changes through the storage event. */
export function createLocalStore(storage: Storage = window.localStorage): FamilyStore {
  const listeners = new Set<Listener>();
  const notify = (key: string, local: boolean) => listeners.forEach((l) => l(key, local));

  const read = <T,>(key: string): T | undefined => {
    try {
      const raw = storage.getItem(PREFIX + key);
      return raw ? (JSON.parse(raw) as T) : undefined;
    } catch {
      return undefined;
    }
  };
  const write = async (key: string, value: unknown) => {
    storage.setItem(PREFIX + key, JSON.stringify(value));
    notify(key, true);
  };

  const onStorage = (e: StorageEvent) => {
    if (e.key?.startsWith(PREFIX)) notify(e.key.slice(PREFIX.length), false);
  };
  window.addEventListener('storage', onStorage);

  const watch = (key: string, emit: (local: boolean) => void) => {
    const l: Listener = (k, local) => k === key && emit(local);
    listeners.add(l);
    return () => void listeners.delete(l);
  };

  const dayPath = (day: string, pid: string) => `days/${dayDocId(day, pid)}`;

  return {
    subscribeRoutine(id, cb) {
      const key = `routines/${id}`;
      const emit = (local: boolean) => {
        const s: RoutineSnapshot = { routine: read<Routine>(key), local, pendingSync: false };
        cb(s);
      };
      emit(true);
      return watch(key, emit);
    },
    saveRoutine(routine) {
      return write(`routines/${routine.id}`, routine);
    },
    subscribeDay(day, pid, cb) {
      const key = dayPath(day, pid);
      const emit = () => cb(read<DayRecord>(key)?.doneStepIds ?? []);
      emit();
      return watch(key, emit);
    },
    async setStepDone(day, pid, stepId, done) {
      const key = dayPath(day, pid);
      const prev = read<DayRecord>(key)?.doneStepIds ?? [];
      const next = done ? (prev.includes(stepId) ? prev : [...prev, stepId]) : prev.filter((s) => s !== stepId);
      await write(key, { doneStepIds: next });
    },
    onWriteError() {
      return () => {};
    },
  };
}
