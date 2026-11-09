import { describe, expect, it } from 'vitest';
import { forSchoolDay } from '../now/school';
import { isSchoolDay, noSchoolReason } from './vic';

const d = (s: string) => new Date(`${s}T12:00:00`);

describe('school days', () => {
  it('is a school day on a term weekday', () => expect(isSchoolDay(d('2026-11-10'))).toBe(true));
  it('is not on Melbourne Cup day', () => expect(noSchoolReason(d('2026-11-03'))?.label).toBe('Melbourne Cup Day'));
  it('is not on weekends', () => { expect(isSchoolDay(d('2026-11-14'))).toBe(false); expect(isSchoolDay(d('2026-11-15'))).toBe(false); });
  it('is not in the school holidays', () => expect(noSchoolReason(d('2026-12-22'))?.reason).toBe('school-holidays'));
  it('is not between terms 2 and 3', () => expect(isSchoolDay(d('2026-07-08'))).toBe(false));
  it('honours extra days off', () => expect(isSchoolDay(d('2026-11-10'), { daysOff: ['2026-11-10'] })).toBe(false));
});

describe('forSchoolDay', () => {
  const steps = [{ id: 'a' }, { id: 'b', when: 'school' as const }, { id: 'c', when: 'off' as const }];
  it('hides school-only steps on days off', () => expect(forSchoolDay(steps, false).map((s) => s.id)).toEqual(['a', 'c']));
  it('hides off-only steps on school days', () => expect(forSchoolDay(steps, true).map((s) => s.id)).toEqual(['a', 'b']));
});
