import {
  arrayRemove,
  arrayUnion,
  doc,
  onSnapshot,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import { dayDocId } from '../date/dayKey';
import type { FamilyStore } from './store';
import type { Routine } from './types';

/**
 * One family's data in Firestore. Writes are not awaited: Firestore applies
 * them to the on-device cache at once (so they work offline) and syncs later.
 * Only a refused write is reported, through onWriteError.
 */
export function createFirestoreStore(db: Firestore, familyId: string): FamilyStore {
  const errorListeners = new Set<(e: unknown) => void>();
  const reportError = (e: unknown) => {
    console.error('Firestore write failed', e);
    errorListeners.forEach((l) => l(e));
  };
  const familyDoc = (...path: string[]) => doc(db, 'families', familyId, ...path);

  return {
    subscribeRoutine(id, cb) {
      return onSnapshot(familyDoc('routines', id), { includeMetadataChanges: true }, (snap) => {
        const data = snap.data() as Omit<Routine, 'id'> | undefined;
        cb({
          routine: data ? { ...data, id } : undefined,
          local: snap.metadata.hasPendingWrites,
          pendingSync: snap.metadata.hasPendingWrites,
        });
      });
    },
    async saveRoutine(routine) {
      const { id, ...data } = routine;
      setDoc(familyDoc('routines', id), data).catch(reportError);
    },
    subscribeDay(day, pid, cb) {
      return onSnapshot(familyDoc('days', dayDocId(day, pid)), (snap) => {
        cb((snap.data()?.doneStepIds as string[] | undefined) ?? []);
      });
    },
    async setStepDone(day, pid, stepId, done) {
      setDoc(
        familyDoc('days', dayDocId(day, pid)),
        { personId: pid, date: day, doneStepIds: done ? arrayUnion(stepId) : arrayRemove(stepId) },
        { merge: true },
      ).catch(reportError);
    },
    onWriteError(cb) {
      errorListeners.add(cb);
      return () => void errorListeners.delete(cb);
    },
  };
}
