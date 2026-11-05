import { moveItem } from '../ordering/order';

export type Priority = 'high' | 'medium' | 'low';
export const PRIORITIES: Priority[] = ['high', 'medium', 'low'];
export const PRIORITY_LABELS: Record<Priority, string> = { high: 'High', medium: 'Medium', low: 'Low' };

/** families/{fid}/braindump/{parentUid}: one array; each group shows its items in array order. */
export interface DumpItem {
  id: string;
  text: string;
  priority: Priority;
  done: boolean;
}

export const inGroup = (items: DumpItem[], p: Priority, done = false) =>
  items.filter((i) => i.priority === p && i.done === done);

/**
 * Moves an item into a group (the same one or another), placed before `beforeId`,
 * or at the end of that group when `beforeId` is null. One new array, so one write.
 */
export function moveToGroup(items: DumpItem[], id: string, priority: Priority, beforeId: string | null): DumpItem[] {
  const item = items.find((i) => i.id === id);
  if (!item || id === beforeId) return items.slice();
  const rest = items.filter((i) => i.id !== id);
  const moved = { ...item, priority };
  let at = beforeId ? rest.findIndex((i) => i.id === beforeId) : -1;
  if (at < 0) {
    const lastOfGroup = rest.map((i) => i.priority).lastIndexOf(priority);
    at = lastOfGroup < 0 ? rest.length : lastOfGroup + 1;
  }
  return [...rest.slice(0, at), moved, ...rest.slice(at)];
}

/** Drag-and-drop result inside one group: same semantics as a sortable list. */
export function dropWithinGroup(items: DumpItem[], id: string, overId: string): DumpItem[] {
  return moveItem(items, items.findIndex((i) => i.id === id), items.findIndex((i) => i.id === overId));
}

/** Arrow buttons: swap with the neighbour in the same group (skipping other groups and done items). */
export function moveInGroup(items: DumpItem[], id: string, dir: -1 | 1): DumpItem[] {
  const item = items.find((i) => i.id === id);
  if (!item) return items.slice();
  const group = inGroup(items, item.priority, item.done);
  const pos = group.findIndex((i) => i.id === id);
  const neighbour = group[pos + dir];
  if (!neighbour) return items.slice();
  return moveItem(items, items.indexOf(item), items.indexOf(neighbour));
}
