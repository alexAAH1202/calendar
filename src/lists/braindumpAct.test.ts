import { describe, expect, it } from 'vitest';
import { archived, nextStep, pickedToday, reminderDue, snoozed, togglePick, type DumpItem } from './braindump';

const T = '2026-11-09';
const item = (id: string, over: Partial<DumpItem> = {}): DumpItem => ({ id, text: id, priority: 'medium', done: false, ...over });

describe('today’s three', () => {
  it('picks up to three, unpicks, and refuses a fourth', () => {
    let list: DumpItem[] = ['a', 'b', 'c', 'd'].map((id) => item(id));
    for (const id of ['a', 'b', 'c']) list = togglePick(list, id, T) as DumpItem[];
    expect(pickedToday(list, T).map((i) => i.id)).toEqual(['a', 'b', 'c']);
    expect(togglePick(list, 'd', T)).toMatch(/already has three/);
    list = togglePick(list, 'b', T) as DumpItem[];
    expect(pickedToday(list, T).map((i) => i.id)).toEqual(['a', 'c']);
  });
  it('yesterday’s picks do not count today', () => {
    expect(pickedToday([item('a', { today: '2026-11-08' })], T)).toHaveLength(0);
  });
});

describe('reminders, archive, small steps', () => {
  const now = new Date(2026, 10, 9).getTime();
  it('a reminder is snoozed before its date and due from it', () => {
    expect(snoozed(item('a', { remindOn: '2026-11-20' }), T)).toBe(true);
    expect(reminderDue(item('a', { remindOn: '2026-11-09' }), T)).toBe(true);
    expect(reminderDue(item('a', { remindOn: '2026-11-09', done: true }), T)).toBe(false);
  });
  it('only untouched low items drift into the archive', () => {
    const old = now - 22 * 86_400_000;
    expect(archived(item('a', { priority: 'low', touched: old }), T, now)).toBe(true);
    expect(archived(item('a', { priority: 'medium', touched: old }), T, now)).toBe(false);
    expect(archived(item('a', { priority: 'low', touched: now - 86_400_000 }), T, now)).toBe(false);
    expect(archived(item('a', { priority: 'low', touched: old, today: T }), T, now)).toBe(false);
    expect(archived(item('a', { priority: 'low', touched: old, remindOn: '2026-12-01' }), T, now)).toBe(false);
    expect(archived(item('a', { priority: 'low' }), T, now)).toBe(false); // older items without a date stay put
  });
  it('the next small step is the first not done', () => {
    expect(nextStep(item('a', { steps: [{ id: '1', text: 'Find the form', done: true }, { id: '2', text: 'Fill in page 1', done: false }] }))?.text).toBe('Fill in page 1');
    expect(nextStep(item('a'))).toBeUndefined();
  });
});
