/** A bounded, immutable undo stack (default 10 entries) for reorder, delete and move. */
export interface UndoStack<T> {
  readonly entries: readonly T[];
  readonly limit: number;
}

export function createUndoStack<T>(limit = 10): UndoStack<T> {
  return { entries: [], limit };
}

/** Push a snapshot; the oldest snapshot is dropped once the limit is reached. */
export function pushUndo<T>(stack: UndoStack<T>, snapshot: T): UndoStack<T> {
  const entries = [...stack.entries, snapshot];
  return { ...stack, entries: entries.slice(Math.max(0, entries.length - stack.limit)) };
}

/** Returns the most recent snapshot (or undefined) and the stack without it. */
export function popUndo<T>(stack: UndoStack<T>): [T | undefined, UndoStack<T>] {
  if (stack.entries.length === 0) return [undefined, stack];
  return [stack.entries[stack.entries.length - 1], { ...stack, entries: stack.entries.slice(0, -1) }];
}

export function canUndo<T>(stack: UndoStack<T>): boolean {
  return stack.entries.length > 0;
}
