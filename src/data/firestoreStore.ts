import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { dayDocId } from '../date/dayKey';
import type { FamilyStore } from './store';
import type { Person, Routine, Template } from './types';

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
    subscribePeople(cb) {
      return onSnapshot(collection(db, 'families', familyId, 'people'), (snap) =>
        cb(snap.docs.map((d) => ({ ...(d.data() as Omit<Person, 'id'>), id: d.id }))),
      );
    },
    async savePerson(person) {
      const { id, ...data } = person;
      setDoc(familyDoc('people', id), data).catch(reportError);
    },
    async deletePerson(personId, routineIds) {
      const batch = writeBatch(db);
      routineIds.forEach((rid) => batch.delete(familyDoc('routines', rid)));
      batch.delete(familyDoc('people', personId));
      batch.commit().catch(reportError);
    },
    subscribeTemplates(cb) {
      return onSnapshot(collection(db, 'families', familyId, 'templates'), (snap) =>
        cb(snap.docs.map((d) => ({ ...(d.data() as Omit<Template, 'id'>), id: d.id }))),
      );
    },
    async saveTemplate(template) {
      const { id, ...data } = template;
      setDoc(familyDoc('templates', id), data).catch(reportError);
    },
    async deleteTemplate(id) {
      deleteDoc(familyDoc('templates', id)).catch(reportError);
    },
    onWriteError(cb) {
      errorListeners.add(cb);
      return () => void errorListeners.delete(cb);
    },
  };
}
