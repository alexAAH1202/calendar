import { describe, expect, it } from 'vitest';
import type { CalEvent } from '../calendar/types';
import { DEFAULT_SCHOOL, schoolDoneMessage, schoolLeaveAt } from './school';
import { DEFAULT_TRAVEL, departGuess, occurrenceKey, shouldAsk, travelFor } from './travel';
import { extrasKey } from './upNext';

const start = new Date(2026, 10, 7, 10, 0).getTime(); // Sat 10 am
const min = 60_000;
const aerials: CalEvent = { id: 'a|1', eventId: 'aerials@google.com', calendarId: 'c', title: 'Aerials', location: 'Melton Aerial Studio, Melton VIC',
  creator: '', allDay: false, start, end: start + 3600_000 };
const settings = { ...DEFAULT_TRAVEL, home: '1 Home St, Caroline Springs' };

describe('asking Maps', () => {
  it('first within 6 hours, then hourly, then every 15 minutes in the last 90', () => {
    expect(shouldAsk(start, start - 7 * 60 * min)).toBe(false);
    expect(shouldAsk(start, start - 5 * 60 * min)).toBe(true);
    const at = (t: number) => ({ minutes: 27, traffic: true, distance: '', fetchedAt: t });
    expect(shouldAsk(start, start - 3 * 60 * min, at(start - 3.5 * 60 * min))).toBe(false);
    expect(shouldAsk(start, start - 3 * 60 * min, at(start - 4 * 60 * min))).toBe(true);
    expect(shouldAsk(start, start - 60 * min, at(start - 70 * min))).toBe(false);
    expect(shouldAsk(start, start - 60 * min, at(start - 76 * min))).toBe(true);
    expect(shouldAsk(start, start + min)).toBe(false);
  });
  it('asks about leaving at the last known leave time', () => {
    expect(departGuess(start, 5)).toBe(start - 35 * min);
    expect(departGuess(start, 5, { minutes: 27, traffic: true, distance: '', fetchedAt: 0 })).toBe(start - 32 * min);
  });
});

describe('which travel time is used', () => {
  const maps = { [occurrenceKey(aerials)]: { minutes: 27, traffic: true, distance: '24 km', fetchedAt: 0 } };
  it('Maps plus the buffer: leave 9:28 for 10:00', () => {
    const t = travelFor(aerials, {}, maps, settings)!;
    expect(t).toMatchObject({ minutes: 32, fromMaps: true });
    expect(t.label).toBe('27 min drive (traffic) + 5 min buffer');
  });
  it('a time set by hand wins, and 0 means no travel', () => {
    expect(travelFor(aerials, { [extrasKey(aerials)]: 30 }, maps, settings)).toMatchObject({ minutes: 30, label: '30 min travel' });
    expect(travelFor(aerials, { [extrasKey(aerials)]: 0 }, maps, settings)).toBeUndefined();
  });
  it('not without a home address, a place, or with Maps off', () => {
    expect(travelFor(aerials, {}, maps, DEFAULT_TRAVEL)).toBeUndefined();
    expect(travelFor({ ...aerials, location: '' }, {}, maps, settings)).toBeUndefined();
    expect(travelFor(aerials, {}, maps, { ...settings, on: false })).toBeUndefined();
  });
  it('each occurrence of a repeating event keeps its own answer', () => {
    expect(occurrenceKey(aerials)).not.toBe(occurrenceKey({ ...aerials, start: start + 7 * 86_400_000 }));
  });
});

describe('school mornings', () => {
  it('8:10 on weekdays, not at weekends', () => {
    expect(schoolLeaveAt(new Date(2026, 10, 9, 7), DEFAULT_SCHOOL)).toBe('08:10'); // Monday
    expect(schoolLeaveAt(new Date(2026, 10, 13, 7), DEFAULT_SCHOOL)).toBe('08:10'); // Friday
    expect(schoolLeaveAt(new Date(2026, 10, 7, 7), DEFAULT_SCHOOL)).toBeUndefined(); // Saturday
    expect(schoolLeaveAt(new Date(2026, 10, 8, 7), DEFAULT_SCHOOL)).toBeUndefined(); // Sunday
  });
  it('paused through the school holidays, and when switched off', () => {
    const hols = { ...DEFAULT_SCHOOL, holidaysUntil: '2026-11-10' };
    expect(schoolLeaveAt(new Date(2026, 10, 10, 7), hols)).toBeUndefined();
    expect(schoolLeaveAt(new Date(2026, 10, 11, 7), hols)).toBe('08:10');
    expect(schoolLeaveAt(new Date(2026, 10, 9, 7), { ...DEFAULT_SCHOOL, on: false })).toBeUndefined();
  });
});

describe('the school-morning finishing message', () => {
  it('weekday mornings only, not weekends, other times, holidays, or when cleared', () => {
    const msg = 'You can use your iPad in the car – congratulations!';
    expect(schoolDoneMessage(new Date(2026, 10, 9, 7, 50), 'morning', DEFAULT_SCHOOL)).toBe(msg);
    expect(schoolDoneMessage(new Date(2026, 10, 7, 9), 'morning', DEFAULT_SCHOOL)).toBeUndefined(); // Saturday
    expect(schoolDoneMessage(new Date(2026, 10, 9, 15), 'afternoon', DEFAULT_SCHOOL)).toBeUndefined();
    expect(schoolDoneMessage(new Date(2026, 10, 9, 7), 'morning', { ...DEFAULT_SCHOOL, holidaysUntil: '2026-11-20' })).toBeUndefined();
    expect(schoolDoneMessage(new Date(2026, 10, 9, 7), 'morning', { ...DEFAULT_SCHOOL, doneMessage: ' ' })).toBeUndefined();
  });
});
