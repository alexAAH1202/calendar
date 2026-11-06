import { addDays, addMonths, addWeeks, format, isWeekend } from 'date-fns';

export type Repeat = 'none' | 'daily' | 'weekdays' | 'weekly' | 'fortnightly' | 'monthly';

export const REPEAT_LABELS: Record<Repeat, string> = {
  none: 'Once',
  daily: 'Every day',
  weekdays: 'School days (Mon–Fri)',
  weekly: 'Every week',
  fortnightly: 'Every two weeks',
  monthly: 'Every month',
};

/** families/{fid}/chores/{personId}: items array, in display order. */
export interface Chore {
  id: string;
  title: string;
  /** "emoji:🧹" */
  image?: string;
  repeat: Repeat;
  /** yyyy-MM-dd; a one-off without a date is a to-do for any day. */
  due?: string;
  /** One-off: finished. Repeating chores never set this; they move their due date on. */
  done: boolean;
  /** The local day it was last ticked, so it shows as done for the rest of that day. */
  doneOn?: string;
  /** Due date before the last tick, so an accidental tick can be undone exactly. */
  prevDue?: string;
  /** Still shown on a low-energy or running-late day. */
  essential?: boolean;
}

const parse = (key: string) => new Date(`${key}T12:00:00`);
const fmt = (d: Date) => format(d, 'yyyy-MM-dd');

function step(d: Date, repeat: Repeat): Date {
  switch (repeat) {
    case 'daily':
      return addDays(d, 1);
    case 'weekdays': {
      let n = addDays(d, 1);
      while (isWeekend(n)) n = addDays(n, 1);
      return n;
    }
    case 'weekly':
      return addWeeks(d, 1);
    case 'fortnightly':
      return addWeeks(d, 2);
    case 'monthly':
      return addMonths(d, 1);
    default:
      return d;
  }
}

/**
 * The next due date after `today` on the chore's schedule, counted on from its
 * current due date, so a weekly Monday chore stays on Mondays even if done late.
 */
export function nextDue(due: string, repeat: Repeat, today: string): string {
  let d = parse(due);
  if (repeat === 'none') return due;
  do d = step(d, repeat);
  while (fmt(d) <= today);
  return fmt(d);
}

/** Shown on `today`: due today or overdue and not finished, or ticked today. */
export function showsOn(c: Chore, today: string): boolean {
  if (c.doneOn === today) return true;
  if (c.done) return false;
  return !c.due || c.due <= today;
}

export const doneOn = (c: Chore, today: string) => c.doneOn === today;
export const overdue = (c: Chore, today: string) => !!c.due && c.due < today && c.doneOn !== today && !c.done;

export function tick(c: Chore, today: string): Chore {
  if (c.doneOn === today) return c;
  if (c.repeat === 'none') return { ...c, done: true, doneOn: today, prevDue: c.due };
  const due = c.due ?? today;
  return { ...c, done: false, doneOn: today, prevDue: due, due: nextDue(due, c.repeat, today) };
}

export function untick(c: Chore, today: string): Chore {
  if (c.doneOn !== today) return c;
  const { doneOn: _d, prevDue, ...rest } = c;
  return { ...rest, done: false, due: prevDue };
}
