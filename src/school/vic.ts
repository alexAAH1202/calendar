/**
 * Victorian government school terms and Victorian public holidays, built in so the wall works offline.
 * Typed from the published calendars: check against vic.gov.au once a year and add the next year.
 * Pupil-free days are set by each school, so those are added by hand (settings/school.daysOff).
 */
export interface Term { n: number; start: string; end: string }

export const VIC_TERMS: Term[] = [
  { n: 1, start: '2026-01-28', end: '2026-04-02' },
  { n: 2, start: '2026-04-20', end: '2026-06-26' },
  { n: 3, start: '2026-07-13', end: '2026-09-18' },
  { n: 4, start: '2026-10-05', end: '2026-12-18' },
  { n: 1, start: '2027-01-27', end: '2027-04-01' },
  { n: 2, start: '2027-04-19', end: '2027-06-25' },
  { n: 3, start: '2027-07-12', end: '2027-09-17' },
  { n: 4, start: '2027-10-04', end: '2027-12-17' },
];

export const VIC_PUBLIC_HOLIDAYS: Record<string, string> = {
  '2026-01-01': 'New Year’s Day',
  '2026-01-26': 'Australia Day',
  '2026-03-09': 'Labour Day',
  '2026-04-03': 'Good Friday',
  '2026-04-04': 'Saturday before Easter Sunday',
  '2026-04-05': 'Easter Sunday',
  '2026-04-06': 'Easter Monday',
  '2026-04-25': 'ANZAC Day',
  '2026-06-08': 'King’s Birthday',
  '2026-09-25': 'Friday before the AFL Grand Final',
  '2026-11-03': 'Melbourne Cup Day',
  '2026-12-25': 'Christmas Day',
  '2026-12-26': 'Boxing Day',
  '2026-12-28': 'Boxing Day (extra day)',
  '2027-01-01': 'New Year’s Day',
  '2027-01-26': 'Australia Day',
  '2027-03-08': 'Labour Day',
  '2027-03-26': 'Good Friday',
  '2027-03-27': 'Saturday before Easter Sunday',
  '2027-03-28': 'Easter Sunday',
  '2027-03-29': 'Easter Monday',
  '2027-04-25': 'ANZAC Day',
  '2027-06-14': 'King’s Birthday',
  '2027-09-24': 'Friday before the AFL Grand Final',
  '2027-11-02': 'Melbourne Cup Day',
  '2027-12-25': 'Christmas Day',
  '2027-12-26': 'Boxing Day',
  '2027-12-27': 'Christmas Day (extra day)',
  '2027-12-28': 'Boxing Day (extra day)',
};

export const termOn = (day: string): Term | undefined => VIC_TERMS.find((t) => day >= t.start && day <= t.end);
export const publicHoliday = (day: string): string | undefined => VIC_PUBLIC_HOLIDAYS[day];

/** Between terms: the school holidays (only within the years we know). */
export function schoolHolidayOn(day: string): boolean {
  if (termOn(day)) return false;
  return day >= VIC_TERMS[0].start && day <= VIC_TERMS[VIC_TERMS.length - 1].end;
}

const toDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const dayKey = toDay;

export interface DaySettings { holidaysUntil?: string | null; daysOff?: string[] }

export type NoSchoolReason = 'weekend' | 'public-holiday' | 'school-holidays' | 'day-off';

/** Why there is no school on this day, or undefined when it is a school day. */
export function noSchoolReason(date: Date, s: DaySettings = {}): { reason: NoSchoolReason; label: string } | undefined {
  const day = toDay(date);
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return { reason: 'weekend', label: 'Weekend' };
  const ph = publicHoliday(day);
  if (ph) return { reason: 'public-holiday', label: ph };
  if (s.daysOff?.includes(day)) return { reason: 'day-off', label: 'No school today' };
  if (s.holidaysUntil && day <= s.holidaysUntil) return { reason: 'school-holidays', label: 'School holidays' };
  if (schoolHolidayOn(day)) return { reason: 'school-holidays', label: 'School holidays' };
  return undefined;
}

export const isSchoolDay = (date: Date, s: DaySettings = {}) => !noSchoolReason(date, s);

/** A short note for a calendar day: public holiday, term start/end, or school holidays. */
export function dayNotes(day: string): string[] {
  const out: string[] = [];
  const ph = publicHoliday(day);
  if (ph) out.push(ph);
  const t = VIC_TERMS.find((x) => x.start === day);
  if (t) out.push(`Term ${t.n} starts`);
  const e = VIC_TERMS.find((x) => x.end === day);
  if (e) out.push(`Term ${e.n} ends`);
  return out;
}
