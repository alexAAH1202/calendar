import { useCallback, useEffect, useState } from 'react';
import { starChange } from '../lists/stars';
import type { FamilyStore } from './store';

/**
 * Done step ids for one person on one date. When `day` changes at midnight the
 * hook simply reads the new (empty) day; nothing is reset or written.
 */
export function useCompletion(store: FamilyStore, day: string, personId: string) {
  const [done, setDone] = useState<string[]>([]);
  const [starred, setStarred] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setDone([]);
    setStarred([]);
    return store.subscribeDay(day, personId, (rec) => {
      setDone(rec.doneStepIds);
      setStarred(rec.starredStepIds ?? []);
      setLoaded(true);
    });
  }, [store, day, personId]);

  const setStep = useCallback(
    (stepId: string, isDone: boolean, stars = 0) => {
      const delta = starChange({ done: isDone, alreadyStarred: starred.includes(stepId), stars });
      setDone((prev) => (isDone ? (prev.includes(stepId) ? prev : [...prev, stepId]) : prev.filter((id) => id !== stepId)));
      if (delta > 0) setStarred((s) => [...s, stepId]);
      if (delta < 0) setStarred((s) => s.filter((id) => id !== stepId));
      store.setStepDone(day, personId, stepId, isDone, delta).catch(() => {
        /* The tick stays on screen; a refused write is reported by the store. */
      });
    },
    [store, day, personId, starred],
  );

  /** `loaded` turns true on the first read and stays true across the midnight swap. */
  return { done: new Set(done), setStep, loaded };
}
