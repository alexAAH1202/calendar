import { useCallback, useEffect, useRef, useState } from 'react';
import { moveById, moveDown, moveUp, removeById } from '../ordering/order';
import { canUndo, createUndoStack, popUndo, pushUndo, type UndoStack } from '../ordering/undo';
import { newId } from './ids';
import { createSaveQueue, type SaveQueue } from './saveQueue';
import type { FamilyStore } from './store';
import type { Routine, Step } from './types';

type Changes = Record<string, Step[]>;
/** Firestore refuses undefined values: an unset flag is removed, not stored as undefined. Old step timers are dropped. */
const withoutEmpty = (s: Step): Step => {
  const out = { ...s } as Step & { timerSeconds?: number };
  delete out.timerSeconds;
  if (!out.essential) delete out.essential;
  return out;
};
const sameSteps = (a: Step[], b: Step[]) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Several routines (for example one child's morning, afternoon and evening)
 * with optimistic edits and one shared undo stack, so moving a step between
 * lists undoes in one go. Every change shows at once, then each changed
 * routine's whole steps array is written. A failed write never reverts the screen.
 * A change from another device replaces the list (last write wins), clears undo
 * and raises `updatedElsewhere`.
 */
export function useRoutineSet(store: FamilyStore, seeds: Routine[]) {
  const key = seeds.map((s) => s.id).join('|');
  const [routines, setRoutines] = useState<Record<string, Routine>>(() => Object.fromEntries(seeds.map((s) => [s.id, s])));
  const [loadedIds, setLoadedIds] = useState<Set<string>>(new Set());
  const [undo, setUndo] = useState<UndoStack<Changes>>(() => createUndoStack<Changes>(10));
  const [failing, setFailing] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [writeRefused, setWriteRefused] = useState(false);
  const [updatedElsewhere, setUpdatedElsewhere] = useState(false);
  const latest = useRef(routines);
  latest.current = routines;
  const queues = useRef<Record<string, SaveQueue<Routine>>>({});

  useEffect(() => {
    latest.current = Object.fromEntries(seeds.map((s) => [s.id, s]));
    setRoutines(latest.current);
    setLoadedIds(new Set());
    setUndo(createUndoStack<Changes>(10));
    const offs = seeds.map((seed) => {
      queues.current[seed.id] = createSaveQueue(
        (r) => store.saveRoutine(r),
        (f) => setFailing((m) => ({ ...m, [seed.id]: f })),
      );
      let first = true;
      return store.subscribeRoutine(seed.id, (snap) => {
        setPending((m) => ({ ...m, [seed.id]: snap.pendingSync }));
        const wasFirst = first;
        first = false;
        setLoadedIds((l) => (l.has(seed.id) ? l : new Set(l).add(seed.id)));
        const incoming = snap.routine;
        if (!incoming || sameSteps(incoming.steps, latest.current[seed.id].steps)) return;
        latest.current = { ...latest.current, [seed.id]: incoming };
        setRoutines(latest.current);
        if (!snap.local) {
          setUndo(createUndoStack<Changes>(10)); // old snapshots would undo the other device's change
          if (!wasFirst) setUpdatedElsewhere(true);
        }
      });
    });
    const offError = store.onWriteError(() => setWriteRefused(true));
    return () => {
      offs.forEach((off) => off());
      offError();
      Object.values(queues.current).forEach((q) => q.dispose());
      queues.current = {};
    };
  }, [store, key]);

  useEffect(() => {
    if (!updatedElsewhere) return;
    const t = window.setTimeout(() => setUpdatedElsewhere(false), 6000);
    return () => window.clearTimeout(t);
  }, [updatedElsewhere]);

  const commit = useCallback((changes: Changes, recordUndo = true) => {
    const prev = latest.current;
    const real = Object.entries(changes).filter(([rid, steps]) => prev[rid] && !sameSteps(prev[rid].steps, steps));
    if (real.length === 0) return; // no-op: nothing to save or undo
    if (recordUndo) setUndo((u) => pushUndo(u, Object.fromEntries(real.map(([rid]) => [rid, prev[rid].steps]))));
    const next = { ...prev };
    for (const [rid, steps] of real) next[rid] = { ...prev[rid], steps, updatedAt: Date.now() };
    latest.current = next;
    setRoutines(next);
    for (const [rid] of real) queues.current[rid]?.save(next[rid]);
  }, []);

  const stepsOf = (rid: string) => latest.current[rid]?.steps ?? [];
  const one = (rid: string, steps: Step[]) => commit({ [rid]: steps });
  const fresh = (s: Omit<Step, 'id'>): Step => ({ ...s, id: newId('s') });

  return {
    routines,
    /** False until every routine has been read once, so the screen never shows a seed first. */
    loaded: seeds.every((s) => loadedIds.has(s.id)),
    canUndo: canUndo(undo),
    saveFailing: Object.values(failing).some(Boolean),
    pendingSync: Object.values(pending).some(Boolean),
    writeRefused,
    updatedElsewhere,
    retrySave: () => Object.values(queues.current).forEach((q) => q.retryNow()),
    dismissRefused: () => setWriteRefused(false),
    dragMove: (rid: string, activeId: string, overId: string) => one(rid, moveById(stepsOf(rid), activeId, overId)),
    moveUp: (rid: string, id: string) => one(rid, moveUp(stepsOf(rid), id)),
    moveDown: (rid: string, id: string) => one(rid, moveDown(stepsOf(rid), id)),
    remove: (rid: string, id: string) => one(rid, removeById(stepsOf(rid), id)),
    add: (rid: string, title: string, emoji: string) =>
      one(rid, [...stepsOf(rid), fresh({ title, image: `emoji:${emoji}`, stars: 1 })]),
    setEmoji: (rid: string, id: string, emoji: string) =>
      one(rid, stepsOf(rid).map((s) => (s.id === id ? { ...s, image: `emoji:${emoji}` } : s))),
    /** Changes a step's stars or whether it is essential. */
    updateStep: (rid: string, id: string, patch: Partial<Pick<Step, 'stars' | 'essential'>>) =>
      one(rid, stepsOf(rid).map((s) => (s.id === id ? withoutEmpty({ ...s, ...patch }) : s))),
    /** Sets (or with "" clears) the time a list should be finished by. */
    setFinishBy: (rid: string, finishBy: string) => {
      const prev = latest.current[rid];
      if (!prev) return;
      const { finishBy: _old, ...rest } = prev;
      const next: Routine = finishBy ? { ...rest, finishBy, updatedAt: Date.now() } : { ...rest, updatedAt: Date.now() };
      latest.current = { ...latest.current, [rid]: next };
      setRoutines(latest.current);
      queues.current[rid]?.save(next);
    },
    /** Moves a step to the end of another list. One undo puts it back. */
    moveTo: (fromRid: string, toRid: string, id: string) => {
      const step = stepsOf(fromRid).find((s) => s.id === id);
      if (!step || fromRid === toRid) return;
      commit({ [fromRid]: removeById(stepsOf(fromRid), id), [toRid]: [...stepsOf(toRid), step] });
    },
    /** Adds a template's steps (with new ids) to the end of a list, or replaces the list. */
    applyTemplate: (rid: string, steps: Step[], mode: 'append' | 'replace') => {
      const copies = steps.map(({ id: _old, ...rest }) => fresh(rest));
      one(rid, mode === 'replace' ? copies : [...stepsOf(rid), ...copies]);
    },
    undo: () => {
      const [snapshot, rest] = popUndo(undo);
      if (!snapshot) return;
      setUndo(rest);
      commit(snapshot, false);
    },
  };
}

export type RoutineSet = ReturnType<typeof useRoutineSet>;
