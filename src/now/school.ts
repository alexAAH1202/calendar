import { format } from 'date-fns';

/** settings/school: when the children leave for school, so their morning list counts down to it. */
export interface SchoolSettings {
  on: boolean;
  /** "HH:mm" */
  leaveAt: string;
  /** yyyy-MM-dd: no school countdown up to and including this day (school holidays). */
  holidaysUntil?: string | null;
  /** Said when a child finishes their morning list on a school day. */
  doneMessage?: string;
}

/** The family's own times: leave at 8:10 on school days. */
export const DEFAULT_SCHOOL: SchoolSettings = { on: true, leaveAt: '08:10', doneMessage: 'You can use your iPad in the car – congratulations!' };

/** The leave time for school on this date, or undefined (weekend, holidays, or switched off). */
export function schoolLeaveAt(now: Date, s: SchoolSettings): string | undefined {
  if (!s.on) return undefined;
  const dow = now.getDay();
  if (dow === 0 || dow === 6) return undefined;
  if (s.holidaysUntil && format(now, 'yyyy-MM-dd') <= s.holidaysUntil) return undefined;
  return s.leaveAt;
}

/** The message for finishing the morning list on a school day, or undefined (other days and times). */
export function schoolDoneMessage(now: Date, tod: string, s: SchoolSettings): string | undefined {
  if (tod !== 'morning' || !schoolLeaveAt(now, s)) return undefined;
  return s.doneMessage?.trim() || undefined;
}
