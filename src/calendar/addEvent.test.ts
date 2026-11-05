import { describe, expect, it } from 'vitest';
import { toNewEvent } from './AddEventForm';

const base = { calendarId: 'c', title: 'Dentist', location: '', date: '2026-11-10', allDay: false, startTime: '09:30', endTime: '10:15' };

describe('toNewEvent', () => {
  it('uses local times', () => {
    expect(toNewEvent(base)).toMatchObject({
      allDay: false, start: new Date(2026, 10, 10, 9, 30).getTime(), end: new Date(2026, 10, 10, 10, 15).getTime(),
    });
  });
  it('all-day events end the next day (exclusive)', () => {
    expect(toNewEvent({ ...base, allDay: true, date: '2026-12-31' })).toMatchObject({ startDate: '2026-12-31', endDate: '2027-01-01' });
  });
  it('an end before the start means after midnight', () => {
    const ev = toNewEvent({ ...base, startTime: '22:00', endTime: '01:00' });
    expect(typeof ev !== 'string' && ev.end! - ev.start!).toBe(3 * 3600000);
  });
  it('asks for a name', () => expect(toNewEvent({ ...base, title: '  ' })).toBe('Give the event a name.'));
});
