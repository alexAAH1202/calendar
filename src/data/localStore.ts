import { dayDocId } from '../date/dayKey';
import type { FamilyStore, RoutineSnapshot } from './store';
import { SEED_CHILD } from './seed';
import type { DayRecord, Person, Routine, Template } from './types';

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

  /** Every stored document under a collection prefix, e.g. "people/". */
  const list = <T,>(prefix: string): T[] => {
    const out: T[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k?.startsWith(PREFIX + prefix)) {
        const v = read<T>(k.slice(PREFIX.length));
        if (v) out.push(v);
      }
    }
    return out;
  };
  const watchPrefix = (prefix: string, emit: () => void) => {
    const l: Listener = (k) => k.startsWith(prefix) && emit();
    listeners.add(l);
    return () => void listeners.delete(l);
  };
  const remove = (key: string) => {
    storage.removeItem(PREFIX + key);
    notify(key, true);
  };

  const savePerson = async (person: Person) => {
    if (!storage.getItem(PREFIX + 'people:init')) {
      // The first save makes the example child a real, stored person.
      storage.setItem(PREFIX + 'people:init', '1');
      if (person.id !== SEED_CHILD.id) storage.setItem(PREFIX + `people/${SEED_CHILD.id}`, JSON.stringify(SEED_CHILD));
    }
    await write(`people/${person.id}`, person);
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
    subscribePeople(cb) {
      // A device that has never saved anyone starts with the example child.
      const emit = () => cb(storage.getItem(PREFIX + 'people:init') ? list<Person>('people/') : [SEED_CHILD]);
      emit();
      return watchPrefix('people', emit);
    },
    savePerson,
    async updatePerson(personId, changes) {
      const prev = read<Person>(`people/${personId}`) ?? (personId === SEED_CHILD.id ? SEED_CHILD : undefined);
      if (!prev) return;
      const next = { ...prev, ...changes, sensory: { ...prev.sensory, ...changes.sensory } };
      await savePerson(next);
    },
    async deletePerson(personId, routineIds) {
      storage.setItem(PREFIX + 'people:init', '1');
      routineIds.forEach((id) => remove(`routines/${id}`));
      remove(`people/${personId}`);
    },
    subscribeTemplates(cb) {
      const emit = () => cb(list<Template>('templates/'));
      emit();
      return watchPrefix('templates/', emit);
    },
    saveTemplate(template) {
      return write(`templates/${template.id}`, template);
    },
    async deleteTemplate(id) {
      remove(`templates/${id}`);
    },
    watchDoc(path, cb) {
      const key = path.join('/');
      const emit = () => cb(read(key));
      emit();
      return watch(key, emit);
    },
    async putDoc(path, data, merge = false) {
      const key = path.join('/');
      await write(key, merge ? { ...(read<object>(key) ?? {}), ...data } : data);
    },
    watchCollection(path, cb) {
      const prefix = path.join('/') + '/';
      const emit = () => {
        const docs: { id: string }[] = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (!k?.startsWith(PREFIX + prefix)) continue;
          const id = k.slice(PREFIX.length + prefix.length);
          const v = id && !id.includes('/') ? read<object>(prefix + id) : undefined;
          if (v) docs.push({ ...v, id });
        }
        cb(docs as never);
      };
      emit();
      return watchPrefix(prefix, emit);
    },
    async removeDoc(path) {
      remove(path.join('/'));
    },
    onWriteError() {
      return () => {};
    },
  };
}
