import { useCallback, useEffect, useRef, useState } from 'react';
import { moveById, moveDown, moveUp, removeById } from '../ordering/order';
import { canUndo, createUndoStack, popUndo, pushUndo, type UndoStack } from '../ordering/undo';
import { createSaveQueue, type SaveQueue } from './saveQueue';
import type { FamilyStore } from './store';
import type { Routine, Step } from './types';

const sameSteps = (a: Step[], b: Step[]) => JSON.stringify(a) === JSON.stringify(b);

/**
 * A routine's steps with optimistic edits. Every change updates the screen at
 * once, then writes the whole steps array. A failed write never reverts the order.
 * A change from another device replaces the list (last write wins) and raises
 * `updatedElsewhere` so the screen can say so instead of reshuffling silently.
 */
export function useRoutine(store: FamilyStore, seed: Routine) {
  const [routine, setRoutine] = useState<Routine>(seed);
  const [undo, setUndo] = useState<UndoStack<Step[]>>(() => createUndoStack<Step[]>(10));
  const [saveFailing, setSaveFailing] = useState(false);
  const [writeRefused, setWriteRefused] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);
  const [updatedElsewhere, setUpdatedElsewhere] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const queue = useRef<SaveQueue<Routine> | null>(null);
  const latest = useRef(routine);
  latest.current = routine;

  useEffect(() => {
    queue.current = createSaveQueue((r) => store.saveRoutine(r), setSaveFailing);
    const offError = store.onWriteError(() => setWriteRefused(true));
    let first = true;
    const offRoutine = store.subscribeRoutine(seed.id, (snap) => {
      setPendingSync(snap.pendingSync);
      setLoaded(true);
      const incoming = snap.routine;
      const wasFirst = first;
      first = false;
      if (!incoming || sameSteps(incoming.steps, latest.current.steps)) return;
      latest.current = incoming;
      setRoutine(incoming);
      if (!snap.local) {
        setUndo(createUndoStack<Step[]>(10)); // old snapshots would undo the other device's change
        if (!wasFirst) setUpdatedElsewhere(true);
      }
    });
    return () => {
      offRoutine();
      offError();
      queue.current?.dispose();
    };
  }, [store, seed.id]);

  useEffect(() => {
    if (!updatedElsewhere) return;
    const t = window.setTimeout(() => setUpdatedElsewhere(false), 6000);
    return () => window.clearTimeout(t);
  }, [updatedElsewhere]);

  const commit = useCallback((steps: Step[], recordUndo = true) => {
    const prev = latest.current;
    if (recordUndo && sameSteps(prev.steps, steps)) return; // no-op: nothing to save or undo
    const next: Routine = { ...prev, steps, updatedAt: Date.now() };
    if (recordUndo) setUndo((u) => pushUndo(u, prev.steps));
    latest.current = next;
    setRoutine(next);
    queue.current?.save(next);
  }, []);

  const current = () => latest.current.steps;

  return {
    steps: routine.steps,
    /** False until the stored routine has been read once, so the screen never shows the seed first. */
    loaded,
    saveFailing,
    writeRefused,
    pendingSync,
    updatedElsewhere,
    canUndo: canUndo(undo),
    retrySave: () => queue.current?.retryNow(),
    dismissRefused: () => setWriteRefused(false),
    dragMove: (activeId: string, overId: string) => commit(moveById(current(), activeId, overId)),
    moveUp: (id: string) => commit(moveUp(current(), id)),
    moveDown: (id: string) => commit(moveDown(current(), id)),
    remove: (id: string) => commit(removeById(current(), id)),
    add: (title: string, emoji: string) =>
      commit([
        ...current(),
        { id: `s_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, title, image: `emoji:${emoji}`, stars: 1 },
      ]),
    setEmoji: (id: string, emoji: string) =>
      commit(current().map((s) => (s.id === id ? { ...s, image: `emoji:${emoji}` } : s))),
    undo: () => {
      const [snapshot, rest] = popUndo(undo);
      if (!snapshot) return;
      setUndo(rest);
      commit(snapshot, false);
    },
  };
}

