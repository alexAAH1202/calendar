import { useCallback, useEffect, useState } from 'react';
import { loadDay, saveDay } from './storage';

/**
 * Done step ids for one person on one date. When `day` changes at midnight the
 * hook simply reads the new (empty) day; nothing is reset or written.
 */
export function useCompletion(day: string, personId: string) {
  const [done, setDone] = useState<string[]>(() => loadDay(day, personId).doneStepIds);

  useEffect(() => {
    setDone(loadDay(day, personId).doneStepIds);
  }, [day, personId]);

  const setStep = useCallback(
    (stepId: string, isDone: boolean) => {
      setDone((prev) => {
        const next = isDone
          ? prev.includes(stepId) ? prev : [...prev, stepId]
          : prev.filter((id) => id !== stepId);
        void saveDay(day, personId, { doneStepIds: next }).catch(() => {
          /* localStorage full or blocked: the tick stays on screen for today. */
        });
        return next;
      });
    },
    [day, personId],
  );

  return { done: new Set(done), setStep };
}
