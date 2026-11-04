import { useCallback, useEffect, useRef, useState } from 'react';
import { moveById, moveDown, moveUp, removeById, sameOrder } from '../ordering/order';
import { canUndo, createUndoStack, popUndo, pushUndo, type UndoStack } from '../ordering/undo';
import { createSaveQueue, type SaveQueue } from './saveQueue';
import { loadRoutine, saveRoutine } from './storage';
import type { Routine, Step } from './types';

/**
 * A routine's steps with optimistic edits. Every change updates the screen at
 * once, then writes the whole steps array. A failed write never reverts the order.
 */
export function useRoutine(seed: Routine) {
  const [routine, setRoutine] = useState<Routine>(() => loadRoutine(seed.id) ?? seed);
  const [undo, setUndo] = useState<UndoStack<Step[]>>(() => createUndoStack<Step[]>(10));
  const [saveFailing, setSaveFailing] = useState(false);
  const queue = useRef<SaveQueue<Routine> | null>(null);
  const latest = useRef(routine);
  latest.current = routine;

  useEffect(() => {
    queue.current = createSaveQueue(saveRoutine, setSaveFailing);
    return () => queue.current?.dispose();
  }, []);

  const commit = useCallback((steps: Step[], recordUndo = true) => {
    const prev = latest.current;
    if (recordUndo && sameOrder(prev.steps, steps)) return; // no-op move: nothing to save or undo
    const next: Routine = { ...prev, steps, updatedAt: Date.now() };
    if (recordUndo) setUndo((u) => pushUndo(u, prev.steps));
    latest.current = next;
    setRoutine(next);
    queue.current?.save(next);
  }, []);

  const steps = routine.steps;

  return {
    steps,
    saveFailing,
    canUndo: canUndo(undo),
    retrySave: () => queue.current?.retryNow(),
    dragMove: (activeId: string, overId: string) => commit(moveById(latest.current.steps, activeId, overId)),
    moveUp: (id: string) => commit(moveUp(latest.current.steps, id)),
    moveDown: (id: string) => commit(moveDown(latest.current.steps, id)),
    remove: (id: string) => commit(removeById(latest.current.steps, id)),
    add: (title: string) =>
      commit([...latest.current.steps, { id: `s_${Date.now().toString(36)}`, title, stars: 1 }]),
    undo: () => {
      const [snapshot, rest] = popUndo(undo);
      if (!snapshot) return;
      setUndo(rest);
      commit(snapshot, false);
    },
  };
}
