/**
 * Pure list-ordering helpers. Array order is the display order, so every
 * reorder returns a new array and never mutates the input.
 */
export interface HasId {
  id: string;
}

/** Move the item at `from` to `to`. Out-of-range indexes return the list unchanged. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list.slice();
  }
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Move `activeId` to the position currently held by `overId` (dnd-kit drop). */
export function moveById<T extends HasId>(list: readonly T[], activeId: string, overId: string): T[] {
  const from = list.findIndex((i) => i.id === activeId);
  const to = list.findIndex((i) => i.id === overId);
  return moveItem(list, from, to);
}

export function moveUp<T extends HasId>(list: readonly T[], id: string): T[] {
  const i = list.findIndex((x) => x.id === id);
  return i > 0 ? moveItem(list, i, i - 1) : list.slice();
}

export function moveDown<T extends HasId>(list: readonly T[], id: string): T[] {
  const i = list.findIndex((x) => x.id === id);
  return i >= 0 && i < list.length - 1 ? moveItem(list, i, i + 1) : list.slice();
}

export function removeById<T extends HasId>(list: readonly T[], id: string): T[] {
  return list.filter((x) => x.id !== id);
}

/** True when two lists hold the same ids in the same order. */
export function sameOrder<T extends HasId>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((x, i) => x.id === b[i].id);
}
