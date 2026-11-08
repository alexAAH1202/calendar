import { describe, expect, it } from 'vitest';
import { DEFAULT_REWARD, rewardProgress, starChange } from '../lists/stars';
import { inSleepWindow, shouldReload } from './schedule';

const at = (h: number, m = 0) => new Date(2026, 10, 9, h, m);

describe('sleep window', () => {
  it('crosses midnight', () => {
    expect([at(19, 29), at(19, 30), at(23, 59), at(0, 0), at(6, 29), at(6, 30)].map((d) => inSleepWindow(d, '19:30', '06:30')))
      .toEqual([false, true, true, true, true, false]);
  });
  it('a daytime window, and equal times meaning never', () => {
    expect(inSleepWindow(at(13), '12:30', '14:00')).toBe(true);
    expect(inSleepWindow(at(14), '12:30', '14:00')).toBe(false);
    expect(inSleepWindow(at(3), '07:00', '07:00')).toBe(false);
  });
});

describe('nightly reload', () => {
  const base = { now: at(3, 10), today: '2026-11-09', idleMs: 6 * 60_000, pendingWrites: false };
  it('reloads once in the early morning when quiet and synced', () => {
    expect(shouldReload(base)).toBe(true);
    expect(shouldReload({ ...base, lastReloadDay: '2026-11-09' })).toBe(false);
    expect(shouldReload({ ...base, lastReloadDay: '2026-11-08' })).toBe(true);
  });
  it('never while someone is using it, with unsynced changes, or outside 3–5 am', () => {
    expect(shouldReload({ ...base, idleMs: 60_000 })).toBe(false);
    expect(shouldReload({ ...base, pendingWrites: true })).toBe(false);
    expect(shouldReload({ ...base, now: at(2, 59) })).toBe(false);
    expect(shouldReload({ ...base, now: at(5, 0) })).toBe(false);
  });
});


describe('stars', () => {
  it('earned once on the first tick, taken back on an untick, not doubled', () => {
    expect(starChange({ done: true, alreadyStarred: false, stars: 2 })).toBe(2);
    expect(starChange({ done: true, alreadyStarred: true, stars: 2 })).toBe(0);
    expect(starChange({ done: false, alreadyStarred: true, stars: 2 })).toBe(-2);
    expect(starChange({ done: false, alreadyStarred: false, stars: 2 })).toBe(0);
  });
  it('progress is clamped', () => {
    expect(rewardProgress({ ...DEFAULT_REWARD, banked: 5 })).toBe(0.25);
    expect(rewardProgress({ ...DEFAULT_REWARD, banked: 50 })).toBe(1);
    expect(rewardProgress({ ...DEFAULT_REWARD, banked: -1 })).toBe(0);
  });
});
