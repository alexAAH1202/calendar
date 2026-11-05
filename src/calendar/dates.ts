import { addDays, format, startOfMonth, startOfWeek } from 'date-fns';
import { dayKey } from '../date/dayKey';
import type { CalEvent } from './types';

/** Weeks start on Monday (Australia). */
export const WEEK_STARTS_ON = 1 as const;

/** True when the event touches the local day `key` (yyyy-MM-dd). */
export function occursOn(e: CalEvent, key: string): boolean {
  if (e.allDay) return !!e.startDate && !!e.endDate && e.startDate <= key && key < e.endDate;
  if (e.start === undefined || e.end === undefined) return false;
  const [y, m, d] = key.split('-').map(Number);
  const dayStart = new Date(y, m - 1, d).getTime();
  const dayEnd = new Date(y, m - 1, d + 1).getTime();
  // A zero-length event at midnight still belongs to that day.
  return e.start < dayEnd && (e.end > dayStart || e.start === dayStart);
}

/** A day's events: all-day first (by title), then timed by start, then title. */
export function eventsOn(events: CalEvent[], key: string): CalEvent[] {
  return events
    .filter((e) => occursOn(e, key))
    .sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      if (!a.allDay && a.start !== b.start) return (a.start ?? 0) - (b.start ?? 0);
      return a.title.localeCompare(b.title);
    });
}

/** "9:30 am – 10:30 am", "From 9:30 am" (continues past the day), "Until 11 am", "All day". */
export function timeLabel(e: CalEvent, key: string): string {
  if (e.allDay) return 'All day';
  const t = (ms: number) => {
    const d = new Date(ms);
    return format(d, d.getMinutes() === 0 ? 'h a' : 'h:mm a').toLowerCase();
  };
  const startsToday = dayKey(new Date(e.start!)) === key;
  const endsToday = dayKey(new Date(e.end!)) === key || dayKey(new Date(e.end! - 1)) === key;
  if (startsToday && endsToday) return e.start === e.end ? t(e.start!) : `${t(e.start!)} – ${t(e.end!)}`;
  if (startsToday) return `From ${t(e.start!)}`;
  if (endsToday) return `Until ${t(e.end!)}`;
  return 'All day';
}

/** The seven local dates of the week containing `date`. */
export function weekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Six rows of seven dates covering the month containing `date`. */
export function monthGrid(date: Date): Date[][] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: WEEK_STARTS_ON });
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
}

/** The span the wall fetches: from the start of last week to six weeks ahead. */
export function fetchWindow(now: Date): { from: number; to: number } {
  const from = startOfWeek(addDays(now, -7), { weekStartsOn: WEEK_STARTS_ON });
  const to = addDays(startOfMonth(addDays(now, 42)), 31);
  return { from: from.getTime(), to: to.getTime() };
}
