import { format } from 'date-fns';

/** settings/school: when the children leave for school, so their morning list counts down to it. */
export interface SchoolSettings {
  on: boolean;
  /** "HH:mm" */
  leaveAt: string;
  /** yyyy-MM-dd: no school countdown up to and including this day (school holidays). */
  holidaysUntil?: string | null;
}

/** The family's own times: leave at 8:10 on school days. */
export const DEFAULT_SCHOOL: SchoolSettings = { on: true, leaveAt: '08:10' };

/** The leave time for school on this date, or undefined (weekend, holidays, or switched off). */
export function schoolLeaveAt(now: Date, s: SchoolSettings): string | undefined {
  if (!s.on) return undefined;
  const dow = now.getDay();
  if (dow === 0 || dow === 6) return undefined;
  if (s.holidaysUntil && format(now, 'yyyy-MM-dd') <= s.holidaysUntil) return undefined;
  return s.leaveAt;
}
