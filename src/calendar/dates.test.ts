import { describe, expect, it } from 'vitest';
import { eventsOn, fetchWindow, monthGrid, occursOn, timeLabel, weekDays } from './dates';
import type { CalEvent } from './types';

const local = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const timed = (title: string, start: number, end: number): CalEvent =>
  ({ id: title, calendarId: 'c', title, location: '', creator: '', allDay: false, start, end });
const allDay = (title: string, startDate: string, endDate: string): CalEvent =>
  ({ id: title, calendarId: 'c', title, location: '', creator: '', allDay: true, startDate, endDate });

describe('occursOn', () => {
  it('all-day end date is exclusive', () => {
    const camp = allDay('Camp', '2026-11-20', '2026-11-22');
    expect(['2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'].map((d) => occursOn(camp, d))).toEqual([false, true, true, false]);
  });
  it('a timed event ending exactly at midnight does not spill into the next day', () => {
    const late = timed('Late', local(2026, 11, 5, 22), local(2026, 11, 6, 0));
    expect(occursOn(late, '2026-11-05')).toBe(true);
    expect(occursOn(late, '2026-11-06')).toBe(false);
  });
  it('an overnight event shows on both days', () => {
    const sleepover = timed('Sleepover', local(2026, 11, 5, 18), local(2026, 11, 6, 10));
    expect(occursOn(sleepover, '2026-11-05') && occursOn(sleepover, '2026-11-06')).toBe(true);
  });
  it('a zero-length event at midnight belongs to that day', () => {
    const z = timed('Reminder', local(2026, 11, 6), local(2026, 11, 6));
    expect(occursOn(z, '2026-11-06')).toBe(true);
    expect(occursOn(z, '2026-11-05')).toBe(false);
  });
});

describe('eventsOn', () => {
  it('puts all-day events first, then by start time', () => {
    const list = [
      timed('Swim', local(2026, 11, 7, 9), local(2026, 11, 7, 10)),
      allDay('Market day', '2026-11-07', '2026-11-08'),
      timed('Party', local(2026, 11, 7, 8), local(2026, 11, 7, 9)),
    ];
    expect(eventsOn(list, '2026-11-07').map((e) => e.title)).toEqual(['Market day', 'Party', 'Swim']);
  });
});

describe('timeLabel', () => {
  it('formats ranges, open ends and whole hours', () => {
    expect(timeLabel(timed('a', local(2026, 11, 7, 9, 30), local(2026, 11, 7, 10)), '2026-11-07')).toBe('9:30 am – 10 am');
    const over = timed('b', local(2026, 11, 5, 18), local(2026, 11, 6, 10));
    expect(timeLabel(over, '2026-11-05')).toBe('From 6 pm');
    expect(timeLabel(over, '2026-11-06')).toBe('Until 10 am');
    expect(timeLabel(allDay('c', '2026-11-07', '2026-11-08'), '2026-11-07')).toBe('All day');
  });
});

describe('grids', () => {
  it('weeks start on Monday', () => {
    const days = weekDays(new Date(2026, 10, 5)); // Thursday
    expect(days[0].getDay()).toBe(1);
    expect(days[0].getDate()).toBe(2);
    expect(days[6].getDate()).toBe(8);
  });
  it('the month grid covers the whole month in 6 weeks', () => {
    const g = monthGrid(new Date(2026, 10, 15));
    expect(g).toHaveLength(6);
    expect(g[0][0].getDay()).toBe(1);
    const all = g.flat().map((d) => `${d.getMonth()}-${d.getDate()}`);
    expect(all).toContain('10-1');
    expect(all).toContain('10-30');
  });
  it('fetch window covers last week to at least six weeks ahead, within the bridge limit', () => {
    const now = new Date(2026, 10, 5);
    const { from, to } = fetchWindow(now);
    expect(from).toBeLessThanOrEqual(new Date(2026, 9, 29).getTime());
    expect(to).toBeGreaterThanOrEqual(new Date(2026, 11, 17).getTime());
    expect((to - from) / 86400000).toBeLessThan(120);
  });
});
