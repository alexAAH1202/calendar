/**
 * The data layer's contract. Screens and hooks use a FamilyStore and never
 * call Firebase or localStorage directly. Two implementations:
 *  - localStore: this device only (used when no Firebase config is set)
 *  - firestoreStore: one family in Firestore, shared by tablet and phones
 */
import type { Routine } from './types';

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
  /** Called when the server refuses a write (for example, permission denied). */
  onWriteError(cb: (error: unknown) => void): () => void;
}
