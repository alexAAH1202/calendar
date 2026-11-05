import { describe, expect, it } from 'vitest';
import { nextDue, overdue, showsOn, tick, untick, type Chore } from './chores';

const chore = (over: Partial<Chore>): Chore => ({ id: 'c', title: 'Feed the dog', repeat: 'daily', done: false, ...over });

describe('nextDue', () => {
  it('daily, weekly, fortnightly, monthly from the due date', () => {
    expect(nextDue('2026-11-05', 'daily', '2026-11-05')).toBe('2026-11-06');
    expect(nextDue('2026-11-02', 'weekly', '2026-11-05')).toBe('2026-11-09'); // stays on Mondays
    expect(nextDue('2026-11-02', 'fortnightly', '2026-11-05')).toBe('2026-11-16');
    expect(nextDue('2026-01-31', 'monthly', '2026-01-31')).toBe('2026-02-28');
  });
  it('weekdays skip the weekend', () => {
    expect(nextDue('2026-11-06', 'weekdays', '2026-11-06')).toBe('2026-11-09'); // Fri -> Mon
  });
  it('catches up past today when done late', () => {
    expect(nextDue('2026-11-01', 'daily', '2026-11-05')).toBe('2026-11-06');
    expect(nextDue('2026-10-05', 'weekly', '2026-11-05')).toBe('2026-11-09');
  });
});

describe('tick and untick', () => {
  const today = '2026-11-05';
  it('a repeating chore moves on but still shows as done today', () => {
    const t = tick(chore({ due: today }), today);
    expect(t).toMatchObject({ due: '2026-11-06', doneOn: today, done: false });
    expect(showsOn(t, today)).toBe(true);
    expect(showsOn(t, '2026-11-06')).toBe(true);
    expect(showsOn({ ...t }, '2026-11-06') && t.doneOn !== '2026-11-06').toBe(true); // due again, not done
  });
  it('untick puts a repeating chore back exactly', () => {
    const c = chore({ due: '2026-11-03' });
    expect(untick(tick(c, today), today)).toEqual({ ...c, prevDue: undefined });
  });
  it('a one-off is finished and disappears the next day', () => {
    const t = tick(chore({ repeat: 'none', due: today }), today);
    expect(t.done).toBe(true);
    expect(showsOn(t, today)).toBe(true);
    expect(showsOn(t, '2026-11-06')).toBe(false);
    expect(untick(t, today).done).toBe(false);
  });
  it('future chores are hidden, overdue ones show and are flagged', () => {
    expect(showsOn(chore({ due: '2026-11-07' }), today)).toBe(false);
    expect(showsOn(chore({ due: '2026-11-01' }), today)).toBe(true);
    expect(overdue(chore({ due: '2026-11-01' }), today)).toBe(true);
    expect(overdue(chore({ repeat: 'none' }), today)).toBe(false);
  });
  it('ticking twice on the same day changes nothing', () => {
    const once = tick(chore({ due: today }), today);
    expect(tick(once, today)).toBe(once);
  });
});
