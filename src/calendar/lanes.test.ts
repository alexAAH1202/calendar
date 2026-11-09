import { describe, expect, it } from 'vitest';
import type { Person } from '../data/types';
import { assignedTo, buildLanePeople, dayWindow, lanesFor, packRows, place, shortTime, ticks, unionWindow, type LanePerson } from './lanes';
import type { CalEvent, FamilyCalendar } from './types';
import { extrasKey } from '../now/upNext';

const DAY = '2026-11-09';
const at = (h: number, m = 0) => new Date(2026, 10, 9, h, m).getTime();
const ev = (title: string, sh: number, eh: number, over: Partial<CalEvent> = {}): CalEvent => ({
  id: `${title}|1`, eventId: `${title}@g`, calendarId: 'c', title, location: '', creator: '', allDay: false, start: at(sh), end: at(eh), ...over,
});
const person = (id: string, name: string, role: Person['role'], order = 0): Person => ({ id, name, role, colour: '#123456', order });

describe('who gets a row', () => {
  const people = [person('astrid', 'Astrid', 'child', 0), person('ethan', 'Ethan', 'child', 1), person('andrew', 'Andrew', 'parent', 1), person('alexp', 'Alex', 'parent', 0)];
  it('adults first (by order), then children', () => {
    expect(buildLanePeople(people, []).map((p) => p.name)).toEqual(['Alex', 'Andrew', 'Astrid', 'Ethan']);
  });
  it('a signed-in parent with no person of their own gets a row; one already listed by name does not', () => {
    const lanes = buildLanePeople(people, [{ id: 'uid1', name: 'alex' }, { id: 'uid2', name: 'Sam' }]);
    expect(lanes.map((p) => p.name)).toEqual(['Sam', 'Alex', 'Andrew', 'Astrid', 'Ethan']);
    expect(lanes.find((p) => p.name === 'Sam')).toMatchObject({ id: 'uid2', kind: 'adult' });
  });
});

describe('who an event is for', () => {
  const lane = (id: string): LanePerson => ({ id, name: id, colour: '#000', kind: 'child' });
  const people = [lane('astrid'), lane('ethan'), lane('andrew')];
  const cal = { defaultWho: ['andrew'] } as FamilyCalendar;
  const e = ev('Swimming', 16, 17);
  it('the event’s own choice wins, even "everyone"; else the calendar’s default; else everyone', () => {
    expect(assignedTo(e, { [extrasKey(e)]: ['astrid', 'ethan'] }, cal, people)).toEqual(['astrid', 'ethan']);
    expect(assignedTo(e, { [extrasKey(e)]: [] }, cal, people)).toEqual([]);
    expect(assignedTo(e, {}, cal, people)).toEqual(['andrew']);
    expect(assignedTo(e, {}, undefined, people)).toEqual([]);
  });
  it('ignores people who no longer exist, and a repeating event shares its choice', () => {
    expect(assignedTo(e, { [extrasKey(e)]: ['gone', 'ethan'] }, cal, people)).toEqual(['ethan']);
    const later = { ...e, id: 'Swimming|2', start: at(16) + 7 * 86_400_000 };
    expect(assignedTo(later, { [extrasKey(e)]: ['ethan'] }, cal, people)).toEqual(['ethan']);
  });
  it('rows: unassigned events go in Everyone; shared events appear in each person’s row', () => {
    const a = ev('Tball', 9, 10), b = ev('Fair', 11, 12);
    const rows = lanesFor([a, b], people, (x) => (x === a ? ['astrid', 'ethan'] : []));
    expect(rows.map((r) => [r.person?.id ?? 'everyone', r.events.map((x) => x.title).join()])).toEqual([
      ['everyone', 'Fair'], ['astrid', 'Tball'], ['ethan', 'Tball'], ['andrew', ''],
    ]);
  });
});

describe('the timeline', () => {
  it('8 am to 8 pm, widened to whole hours for early and late events', () => {
    expect(dayWindow([ev('A', 9, 10)], DAY)).toEqual({ start: 480, end: 1200 });
    expect(dayWindow([ev('A', 6, 7), ev('B', 19, 21)], DAY)).toEqual({ start: 360, end: 1260 });
    expect(dayWindow([ev('Late', 22, 23)], DAY).end).toBe(1380);
  });
  it('places events as a share of the window, clipped to the day and never vanishing', () => {
    const w = { start: 480, end: 1200 }; // 12 hours
    expect(place(ev('A', 10, 11), DAY, w)).toEqual({ left: (120 / 720) * 100, width: (60 / 720) * 100 });
    expect(place(ev('B', 7, 9), DAY, w).left).toBe(0);
    expect(place({ ...ev('C', 10, 10), end: at(10, 1) }, DAY, w).width).toBeGreaterThan(0);
  });
  it('stacks overlapping events (and labels that would run into the next event) into rows', () => {
    const { placed, rows } = packRows([ev('Natalie Correa, MD', 13, 14), ev('Sunset CO-OP', 13, 16), ev('Soccer', 16, 17)], DAY);
    expect(rows).toBe(2);
    expect(placed.map((p) => [p.event.title, p.row])).toEqual([['Natalie Correa, MD', 0], ['Sunset CO-OP', 1], ['Soccer', 0]]);
    const close = packRows([ev('A very long event title here', 9, 9), { ...ev('B', 9, 9), start: at(9, 20), end: at(9, 30) }], DAY);
    expect(close.rows).toBe(2); // the first label needs room, so the second goes underneath
    expect(packRows([], DAY).rows).toBe(1);
  });
  it('two days can share one axis', () => {
    expect(unionWindow({ start: 480, end: 1260 }, { start: 420, end: 1200 })).toEqual({ start: 420, end: 1260 });
  });
  it('labels', () => {
    expect(shortTime(at(9))).toBe('9am');
    expect(shortTime(at(9, 30))).toBe('9:30am');
    expect(shortTime(at(12))).toBe('12pm');
    expect(shortTime(at(0, 5))).toBe('12:05am');
    expect(ticks({ start: 480, end: 1200 }).map((t) => t.label)).toEqual(['8am', '10am', '12pm', '2pm', '4pm', '6pm', '8pm']);
    expect(ticks({ start: 480, end: 1200 })[0].at).toBe(0);
  });
});

describe('assign rules', () => {
  const people: LanePerson[] = [
    { id: 'a', name: 'Astrid', colour: '#000', kind: 'child' },
    { id: 'e', name: 'Ethan', colour: '#000', kind: 'child' },
    { id: 'x', name: 'Alex', colour: '#000', kind: 'adult' },
  ];
  const t = (title: string) => ({ ...ev(title, 9, 10) });
  const cal = { defaultWho: ['x'] } as never;
  it('names in the title beat the calendar default', () => expect(assignedTo(t('Astrid swimming'), {}, cal, people)).toEqual(['a']));
  it('a rule beats names in the title', () => expect(assignedTo(t('Astrid swimming'), {}, cal, people, [{ match: 'swimming', who: ['e'] }])).toEqual(['e']));
  it("the event's own choice beats everything", () => expect(assignedTo(t('Astrid swimming'), { [extrasKey(t('Astrid swimming'))]: [] }, cal, people, [{ match: 'swimming', who: ['e'] }])).toEqual([]));
  it('falls back to the calendar default', () => expect(assignedTo(t('Dentist'), {}, cal, people)).toEqual(['x']));
});

describe('dragging between rows', () => {
  it('moves out of one row into another', async () => {
    const { reassign } = await import('./LaneDay');
    expect(reassign(['a'], 'a', 'e')).toEqual(['e']);
    expect(reassign(['a', 'x'], 'a', 'e')).toEqual(['x', 'e']);
    expect(reassign(['a'], 'a', 'everyone')).toEqual([]);
    expect(reassign([], 'everyone', 'a')).toEqual(['a']);
  });
});
