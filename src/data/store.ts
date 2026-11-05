/**
 * The data layer's contract. Screens and hooks use a FamilyStore and never
 * call Firebase or localStorage directly. Two implementations:
 *  - localStore: this device only (used when no Firebase config is set)
 *  - firestoreStore: one family in Firestore, shared by tablet and phones
 */
import type { Person, Routine, Template } from './types';

export interface RoutineSnapshot {
  /** undefined when the routine has never been saved. */
  routine: Routine | undefined;
  /** True when this snapshot reflects a change made on this device. */
  local: boolean;
  /** True while a change made here has not reached the server yet. */
  pendingSync: boolean;
}

export interface FamilyStore {
  subscribeRoutine(routineId: string, cb: (s: RoutineSnapshot) => void): () => void;
  /** Applies the change on this device at once; syncing happens in the background. */
  saveRoutine(routine: Routine): Promise<void>;
  subscribeDay(day: string, personId: string, cb: (doneStepIds: string[]) => void): () => void;
  setStepDone(day: string, personId: string, stepId: string, done: boolean): Promise<void>;
  /** All people in the family (children and, later, parents). */
  subscribePeople(cb: (people: Person[]) => void): () => void;
  savePerson(person: Person): Promise<void>;
  /** Changes only the given fields (sensory settings merge too), so quick edits never undo each other. */
  updatePerson(personId: string, changes: Partial<Omit<Person, 'id'>>): Promise<void>;
  /** Removes the person and their routines. Day history is kept. */
  deletePerson(personId: string, routineIds: string[]): Promise<void>;
  /** The family's own templates (built-in ones live in the app). */
  subscribeTemplates(cb: (templates: Template[]) => void): () => void;
  saveTemplate(template: Template): Promise<void>;
  deleteTemplate(templateId: string): Promise<void>;
  /**
   * Generic documents inside the family, by path relative to it, e.g. ['settings', 'calendarBridge'].
   * Collections are odd-length paths (['calendars']), documents even-length.
   */
  watchDoc<T>(path: string[], cb: (data: T | undefined) => void): () => void;
  putDoc(path: string[], data: object, merge?: boolean): Promise<void>;
  watchCollection<T>(path: string[], cb: (docs: (T & { id: string })[]) => void): () => void;
  removeDoc(path: string[]): Promise<void>;
  /** Called when the server refuses a write (for example, permission denied). */
  onWriteError(cb: (error: unknown) => void): () => void;
}
