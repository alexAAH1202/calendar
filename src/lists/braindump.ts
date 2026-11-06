import { moveItem } from '../ordering/order';

export type Priority = 'high' | 'medium' | 'low';
export const PRIORITIES: Priority[] = ['high', 'medium', 'low'];
export const PRIORITY_LABELS: Record<Priority, string> = { high: 'High', medium: 'Medium', low: 'Low' };

/** families/{fid}/braindump/{parentUid}: one array; each group shows its items in array order. */
export interface SubStep {
  id: string;
  text: string;
  done: boolean;
}

export interface DumpItem {
  id: string;
  text: string;
  priority: Priority;
  done: boolean;
  /** yyyy-MM-dd when picked as one of that day's three. */
  today?: string;
  /** "Break it down": small steps, the first undone one shown as "Next". */
  steps?: SubStep[];
  /** yyyy-MM-dd from which the item asks for attention again. */
  remindOn?: string;
  /** When it was added or last changed (epoch ms), for the quiet archive. */
  touched?: number;
}

export const TODAY_LIMIT = 3;
const ARCHIVE_AFTER_MS = 21 * 86_400_000;

export const pickedToday = (items: DumpItem[], today: string) => items.filter((i) => !i.done && i.today === today);

/** Picks (or unpicks) an item for today; at most three. Returns the new list, or a message. */
export function togglePick(items: DumpItem[], id: string, today: string, now = Date.now()): DumpItem[] | string {
  const item = items.find((i) => i.id === id);
  if (!item) return items;
  if (item.today === today) return items.map((i) => (i.id === id ? { ...i, today: undefined, touched: now } : i));
  if (pickedToday(items, today).length >= TODAY_LIMIT) return 'Today already has three. Finish or unpick one first.';
  return items.map((i) => (i.id === id ? { ...i, today, touched: now } : i));
}

/** The reminder date has come. */
export const reminderDue = (i: DumpItem, today: string) => !!i.remindOn && i.remindOn <= today && !i.done;
/** Waiting for its reminder date. */
export const snoozed = (i: DumpItem, today: string) => !!i.remindOn && i.remindOn > today && !i.done;

/**
 * Low-priority items nobody has touched for three weeks drift into "Archived" instead of
 * piling up. Display only: nothing is deleted, and a reminder or a pick brings it back.
 */
export function archived(i: DumpItem, today: string, now = Date.now()): boolean {
  if (i.done || i.priority !== 'low' || i.today === today || i.remindOn) return false;
  return i.touched !== undefined && now - i.touched > ARCHIVE_AFTER_MS;
}

/** The first small step not yet done. */
export const nextStep = (i: DumpItem) => i.steps?.find((s) => !s.done);

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
