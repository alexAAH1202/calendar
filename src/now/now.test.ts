import { describe, expect, it } from 'vitest';
import type { CalEvent } from '../calendar/types';
import { extrasKey, finishByLeft, leaveText, minutesText, upNext, urgency } from './upNext';

const at = (h: number, m = 0) => new Date(2026, 10, 9, h, m);
const ev = (title: string, h: number, m = 0, extra: Partial<CalEvent> = {}): CalEvent => ({
  id: `${title}|1`, eventId: `${title}@google.com`, calendarId: 'c', title, location: '', creator: '', allDay: false,
  start: at(h, m).getTime(), end: at(h + 1, m).getTime(), ...extra,
});

describe('up next', () => {
  const events = [ev('Swim', 16), ev('Dentist', 14), ev('Past', 9), { ...ev('Fair', 0), allDay: true, startDate: '2026-11-09', endDate: '2026-11-10' }];
  it('is the next timed event today, with travel time taken off', () => {
    const u = upNext(events, at(13), { [extrasKey(ev('Dentist', 14))]: 20 })!;
    expect(u.event.title).toBe('Dentist');
    expect(new Date(u.leaveAt).getHours() * 60 + new Date(u.leaveAt).getMinutes()).toBe(13 * 60 + 40);
    expect(leaveText(u, at(13))).toBe('leave in 40 min');
    expect(leaveText(u, at(13, 39, ))).toBe('Time to go');
  });
  it('without travel time it counts to the start; nothing after today', () => {
    const u = upNext(events, at(15), {})!;
    expect(u.event.title).toBe('Swim');
    expect(leaveText(u, at(15))).toBe('starts in 1 h');
    expect(upNext(events, at(17), {})).toBeUndefined();
  });
  it('a repeating event shares its travel time across occurrences', () => {
    expect(extrasKey({ id: 'x|1', eventId: 'abc@google.com' })).toBe(extrasKey({ id: 'x|2', eventId: 'abc@google.com' }));
  });
});

describe('urgency and words', () => {
  it('steps at 15, 5 and 1 minutes', () => {
    expect([30, 15, 10, 5, 2, 1, 0, -5].map((m) => urgency(m * 60_000))).toEqual(['later', 'soon', 'soon', 'verySoon', 'verySoon', 'now', 'now', 'now']);
  });
  it('minutes round up and hours read naturally', () => {
    expect(minutesText(30_000)).toBe('1 min');
    expect(minutesText(25 * 60_000)).toBe('25 min');
    expect(minutesText(70 * 60_000)).toBe('1 h 10 min');
  });
  it('finish-by counts down to a local time', () => {
    expect(finishByLeft('08:20', at(8))).toBe(20 * 60_000);
    expect(finishByLeft('08:20', at(8, 30))).toBe(-10 * 60_000);
  });
});
