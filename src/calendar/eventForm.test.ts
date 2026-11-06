import { describe, expect, it } from 'vitest';
import { blankFields, fieldsOf, toNewEvent, type EventFields } from './eventForm';
import type { CalEvent } from './types';

const base: EventFields = {
  calendarId: 'c', title: 'Dentist', location: '', date: '2026-11-10', lastDate: '2026-11-10', allDay: false, startTime: '09:30', endTime: '10:15',
};

describe('toNewEvent', () => {
  it('uses local times', () => {
    expect(toNewEvent(base)).toMatchObject({
      allDay: false, start: new Date(2026, 10, 10, 9, 30).getTime(), end: new Date(2026, 10, 10, 10, 15).getTime(),
    });
  });
  it('all-day events end the day after the last day (exclusive)', () => {
    expect(toNewEvent({ ...base, allDay: true, date: '2026-12-31', lastDate: '2026-12-31' })).toMatchObject({ startDate: '2026-12-31', endDate: '2027-01-01' });
    expect(toNewEvent({ ...base, allDay: true, date: '2026-11-20', lastDate: '2026-11-22' })).toMatchObject({ endDate: '2026-11-23' });
    expect(toNewEvent({ ...base, allDay: true, date: '2026-11-20', lastDate: '2026-11-19' })).toMatchObject({ endDate: '2026-11-21' });
  });
  it('an end before the start means after midnight', () => {
    const ev = toNewEvent({ ...base, startTime: '22:00', endTime: '01:00' });
    expect(typeof ev !== 'string' && ev.end! - ev.start!).toBe(3 * 3600000);
  });
  it('asks for a name', () => expect(toNewEvent({ ...base, title: '  ' })).toBe('Give the event a name.'));
});

describe('fieldsOf and blankFields', () => {
  it('round-trips a timed event', () => {
    const e: CalEvent = { id: 'x', calendarId: 'c', title: 'Swim', location: 'Pool', creator: '', allDay: false,
      start: new Date(2026, 10, 9, 16).getTime(), end: new Date(2026, 10, 9, 17).getTime() };
    expect(toNewEvent(fieldsOf(e))).toMatchObject({ title: 'Swim', location: 'Pool', start: e.start, end: e.end });
  });
  it('round-trips a multi-day all-day event', () => {
    const e: CalEvent = { id: 'x', calendarId: 'c', title: 'Camp', location: '', creator: '', allDay: true, startDate: '2026-11-20', endDate: '2026-11-23' };
    expect(fieldsOf(e)).toMatchObject({ date: '2026-11-20', lastDate: '2026-11-22' });
    expect(toNewEvent(fieldsOf(e))).toMatchObject({ startDate: '2026-11-20', endDate: '2026-11-23' });
  });
  it('a new event starts at the next whole hour on the chosen day', () => {
    expect(blankFields('c', '2026-11-12', new Date(2026, 10, 9, 8, 20))).toMatchObject({ date: '2026-11-12', startTime: '09:00', endTime: '10:00' });
  });
});
