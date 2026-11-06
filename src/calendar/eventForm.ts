import { addDays, addHours, format, startOfHour } from 'date-fns';
import type { CalEvent, NewEvent } from './types';

/** What the event form edits, in local dates and times. */
export interface EventFields {
  calendarId: string;
  title: string;
  location: string;
  date: string;
  /** All-day events: the last day (inclusive). */
  lastDate: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
}

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');
const nextDay = (key: string) => ymd(addDays(new Date(`${key}T12:00:00`), 1));
const prevDay = (key: string) => ymd(addDays(new Date(`${key}T12:00:00`), -1));

/** A blank form for a new event on `day` (yyyy-MM-dd), starting at the next whole hour. */
export function blankFields(calendarId: string, day: string, now = new Date()): EventFields {
  const start = startOfHour(addHours(now, 1));
  return {
    calendarId, title: '', location: '', date: day, lastDate: day, allDay: false,
    startTime: format(start, 'HH:mm'), endTime: format(addHours(start, 1), 'HH:mm'),
  };
}

/** The form filled from an existing event. */
export function fieldsOf(e: CalEvent): EventFields {
  if (e.allDay) {
    return {
      calendarId: e.calendarId, title: e.title, location: e.location, allDay: true,
      date: e.startDate!, lastDate: e.endDate ? prevDay(e.endDate) : e.startDate!, startTime: '09:00', endTime: '10:00',
    };
  }
  const s = new Date(e.start!);
  const en = new Date(e.end!);
  return {
    calendarId: e.calendarId, title: e.title, location: e.location, allDay: false,
    date: ymd(s), lastDate: ymd(s), startTime: format(s, 'HH:mm'), endTime: format(en, 'HH:mm'),
  };
}

/** The bridge's event shape, or a message saying what is missing. */
export function toNewEvent(f: EventFields): NewEvent | string {
  const title = f.title.trim();
  if (!title) return 'Give the event a name.';
  if (!f.date) return 'Choose a date.';
  if (f.allDay) {
    const last = f.lastDate && f.lastDate >= f.date ? f.lastDate : f.date;
    return { calendarId: f.calendarId, title, location: f.location.trim(), allDay: true, startDate: f.date, endDate: nextDay(last) };
  }
  const start = new Date(`${f.date}T${f.startTime}`).getTime();
  let end = new Date(`${f.date}T${f.endTime}`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 'Choose a start and end time.';
  if (end <= start) end = addDays(new Date(end), 1).getTime(); // ends after midnight
  return { calendarId: f.calendarId, title, location: f.location.trim(), allDay: false, start, end };
}
