import { isSchoolDay } from '../school/vic';

/** settings/school: when the children leave for school, so their morning list counts down to it. */
export interface SchoolSettings {
  on: boolean;
  /** "HH:mm" */
  leaveAt: string;
  /** yyyy-MM-dd: no school countdown up to and including this day (school holidays). */
  holidaysUntil?: string | null;
  /** yyyy-MM-dd: extra days with no school (pupil-free days, closures). */
  daysOff?: string[];
  /** Said when a child finishes their morning list on a school day. */
  doneMessage?: string;
}

/** The family's own times: leave at 8:10 on school days. */
export const DEFAULT_SCHOOL: SchoolSettings = { on: true, leaveAt: '08:10', doneMessage: 'You can use your iPad in the car – congratulations!' };

/** The leave time for school on this date, or undefined (weekend, holidays, or switched off). */
export function schoolLeaveAt(now: Date, s: SchoolSettings): string | undefined {
  if (!s.on) return undefined;
  if (!isSchoolDay(now, s)) return undefined;
  return s.leaveAt;
}

/** The message for finishing the morning list on a school day, or undefined (other days and times). */
export function schoolDoneMessage(now: Date, tod: string, s: SchoolSettings): string | undefined {
  if (tod !== 'morning' || !schoolLeaveAt(now, s)) return undefined;
  return s.doneMessage?.trim() || undefined;
}

/** The steps that belong on this kind of day: school-only steps drop out on days off, and vice versa. */
export function forSchoolDay<T extends { when?: 'school' | 'off' }>(items: T[], schoolDay: boolean): T[] {
  return items.filter((i) => !i.when || (i.when === 'school') === schoolDay);
}
