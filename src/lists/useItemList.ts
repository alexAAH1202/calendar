import { useCallback, useEffect, useRef, useState } from 'react';
import { canUndo, createUndoStack, popUndo, pushUndo, type UndoStack } from '../ordering/undo';
import { createSaveQueue, type SaveQueue } from '../data/saveQueue';
import type { FamilyStore } from '../data/store';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * One document holding an `items` array (chores, brain dump). Changes show at
 * once and the whole array is written; a failed write never reverts the screen;
 * a change from another device replaces the list, clears undo and raises
 * `updatedElsewhere` (last write wins). Ten steps of undo.
 */
export function useItemList<T>(store: FamilyStore, path: string[]) {
  const key = path.join('/');
  const [items, setItems] = useState<T[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [undo, setUndo] = useState<UndoStack<T[]>>(() => createUndoStack<T[]>(10));
  const [saveFailing, setSaveFailing] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);
  const [writeRefused, setWriteRefused] = useState(false);
  const [updatedElsewhere, setUpdatedElsewhere] = useState(false);
  const latest = useRef<T[]>([]);
  const queue = useRef<SaveQueue<T[]> | null>(null);

  useEffect(() => {
    latest.current = [];
    setItems([]);
    setLoaded(false);
    setUndo(createUndoStack<T[]>(10));
    queue.current = createSaveQueue((list) => store.putDoc(path, { items: list, updatedAt: Date.now() }), setSaveFailing);
    let first = true;
    const off = store.watchDoc<{ items?: T[] }>(path, (data, meta) => {
      setPendingSync(meta.pendingSync);
      const wasFirst = first;
      first = false;
      setLoaded(true);
      const incoming = data?.items ?? [];
      if (same(incoming, latest.current)) return;
      latest.current = incoming;
      setItems(incoming);
      if (!meta.local && !wasFirst) {
        setUndo(createUndoStack<T[]>(10));
        setUpdatedElsewhere(true);
      }
    });
    const offError = store.onWriteError(() => setWriteRefused(true));
    return () => {
      off();
      offError();
      queue.current?.dispose();
    };
  }, [store, key]); // key stands for path

  useEffect(() => {
    if (!updatedElsewhere) return;
    const t = window.setTimeout(() => setUpdatedElsewhere(false), 6000);
    return () => window.clearTimeout(t);
  }, [updatedElsewhere]);

  /** Replaces the list. `recordUndo: false` for ticks, which have their own guard. */
  const commit = useCallback((next: T[], recordUndo = true) => {
    const prev = latest.current;
    if (same(prev, next)) return;
    if (recordUndo) setUndo((u) => pushUndo(u, prev));
    latest.current = next;
    setItems(next);
    queue.current?.save(next);
  }, []);

  return {
    items,
    loaded,
    current: () => latest.current,
    commit,
    canUndo: canUndo(undo),
    undo: () => {
      const [snapshot, rest] = popUndo(undo);
      if (!snapshot) return;
      setUndo(rest);
      commit(snapshot, false);
    },
    saveFailing,
    pendingSync,
    writeRefused,
    updatedElsewhere,
    retrySave: () => queue.current?.retryNow(),
    dismissRefused: () => setWriteRefused(false),
  };
}

export type ItemList<T> = ReturnType<typeof useItemList<T>>;
