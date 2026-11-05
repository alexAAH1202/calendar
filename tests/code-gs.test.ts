/** Runs apps-script/Code.gs in a sandbox with fake Google services. */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { beforeEach, describe, expect, it } from 'vitest';

const KEY = 'k'.repeat(64);
const code = readFileSync('apps-script/Code.gs', 'utf8');

interface FakeEvent { title: string; start: Date; end: Date; allDay?: boolean; creators?: string[]; location?: string }

function load(props: Record<string, string> = { BRIDGE_KEY: KEY }) {
  const created: unknown[] = [];
  const events: FakeEvent[] = [
    { title: 'Swimming', start: new Date('2026-11-07T22:00:00Z'), end: new Date('2026-11-07T23:00:00Z'), creators: ['Alex@Example.com'] },
    { title: 'School holidays', start: new Date('2026-12-17T13:00:00Z'), end: new Date('2026-12-19T13:00:00Z'), allDay: true },
  ];
  const toEvent = (e: FakeEvent, i: number) => ({
    getId: () => `ev${i}@google.com`,
    getTitle: () => e.title,
    getLocation: () => e.location ?? '',
    getCreators: () => e.creators ?? [],
    isAllDayEvent: () => !!e.allDay,
    getStartTime: () => e.start,
    getEndTime: () => e.end,
    getAllDayStartDate: () => e.start,
    getAllDayEndDate: () => e.end,
  });
  const cal = {
    getId: () => 'family@group.calendar.google.com',
    getName: () => 'Family',
    getColor: () => '#16a765',
    isOwnedByMe: () => true,
    isMyPrimaryCalendar: () => false,
    getTimeZone: () => 'Australia/Sydney',
    getEvents: (from: Date, to: Date) =>
      events.filter((e) => e.end > from && e.start < to).map(toEvent),
    createEvent: (title: string, s: Date, e: Date, o: { location?: string }) => {
      created.push({ title, s, e, o });
      return toEvent({ title, start: s, end: e, location: o.location }, 9);
    },
    createAllDayEvent: (title: string, s: Date, eOrOpts: Date | object, o?: object) => {
      const end = eOrOpts instanceof Date ? eOrOpts : new Date(s.getTime() + 86400000);
      created.push({ title, s, end, o: o ?? eOrOpts });
      return toEvent({ title, start: s, end, allDay: true }, 8);
    },
  };
  const sandbox = {
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => props[k] ?? null,
        setProperty: (k: string, v: string) => { props[k] = v; },
        deleteProperty: (k: string) => { delete props[k]; },
      }),
    },
    CalendarApp: {
      getAllCalendars: () => [cal],
      getCalendarById: (id: string) => (id === cal.getId() ? cal : null),
      getDefaultCalendar: () => cal,
    },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (text: string) => ({ text, setMimeType() { return this; } }),
    },
    Utilities: {
      getUuid: () => '0123456789abcdef0123456789abcdef',
      // Sydney is UTC+11 in summer: enough for these tests.
      formatDate: (d: Date, _tz: string, _f: string) => new Date(d.getTime() + 11 * 3600000).toISOString().slice(0, 10),
      parseDate: (s: string) => new Date(new Date(`${s}T00:00:00Z`).getTime() - 11 * 3600000),
    },
    Logger: { log: () => {} },
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  const post = (body: unknown) =>
    JSON.parse((sandbox as unknown as { doPost: (e: unknown) => { text: string } }).doPost({ postData: { contents: JSON.stringify(body) } }).text);
  return { sandbox: sandbox as unknown as Record<string, () => unknown>, post, created, props };
}

let b: ReturnType<typeof load>;
beforeEach(() => (b = load()));

describe('Code.gs bridge', () => {
  it('refuses a missing, wrong or short key', () => {
    expect(b.post({ action: 'calendars' })).toEqual({ ok: false, error: 'unauthorised' });
    expect(b.post({ action: 'calendars', key: 'x'.repeat(64) })).toEqual({ ok: false, error: 'unauthorised' });
    expect(b.post({ action: 'calendars', key: KEY.slice(1) })).toEqual({ ok: false, error: 'unauthorised' });
  });

  it('refuses everything before setup() has made a key', () => {
    const fresh = load({});
    expect(fresh.post({ action: 'calendars', key: '' })).toEqual({ ok: false, error: 'unauthorised' });
  });

  it('setup() makes a 64-character key once and keeps it', () => {
    const fresh = load({});
    const k1 = fresh.sandbox.setup() as string;
    expect(k1).toHaveLength(64);
    expect(fresh.sandbox.setup()).toBe(k1);
    expect(fresh.post({ action: 'calendars', key: k1 }).ok).toBe(true);
  });

  it('lists calendars', () => {
    expect(b.post({ action: 'calendars', key: KEY }).calendars).toEqual([
      { id: 'family@group.calendar.google.com', name: 'Family', colour: '#16a765', owned: true, primary: false, timeZone: 'Australia/Sydney' },
    ]);
  });

  it('lists timed and all-day events, with local dates for all-day ones', () => {
    const res = b.post({
      action: 'events', key: KEY, calendarIds: ['family@group.calendar.google.com', 'unknown'],
      from: Date.parse('2026-11-01T00:00:00Z'), to: Date.parse('2027-01-01T00:00:00Z'),
    });
    expect(res.ok).toBe(true);
    expect(res.events[0]).toMatchObject({ title: 'Swimming', allDay: false, start: Date.parse('2026-11-07T22:00:00Z'), creator: 'alex@example.com' });
    expect(res.events[1]).toMatchObject({ title: 'School holidays', allDay: true, startDate: '2026-12-18', endDate: '2026-12-20' });
  });

  it('refuses a bad or too-long range', () => {
    expect(b.post({ action: 'events', key: KEY, calendarIds: [], from: 10, to: 5 }).error).toBe('bad_range');
    expect(b.post({ action: 'events', key: KEY, calendarIds: [], from: 0, to: 200 * 86400000 }).error).toBe('range_too_long');
  });

  it('creates timed and all-day events', () => {
    const timed = b.post({ action: 'create', key: KEY, calendarId: 'family@group.calendar.google.com', title: ' Dentist ',
      start: Date.parse('2026-11-10T23:00:00Z'), end: Date.parse('2026-11-11T00:00:00Z'), location: 'Main St' });
    expect(timed).toMatchObject({ ok: true, event: { title: 'Dentist', allDay: false, location: 'Main St' } });
    const allDay = b.post({ action: 'create', key: KEY, calendarId: 'family@group.calendar.google.com', title: 'Camp',
      allDay: true, startDate: '2026-11-20', endDate: '2026-11-22' });
    expect(allDay).toMatchObject({ ok: true, event: { allDay: true, startDate: '2026-11-20', endDate: '2026-11-22' } });
  });

  it('refuses a create without title, with a bad time, or on an unknown calendar', () => {
    const base = { action: 'create', key: KEY, calendarId: 'family@group.calendar.google.com', start: 2, end: 1 };
    expect(b.post({ ...base, title: '' }).error).toBe('title_missing');
    expect(b.post({ ...base, title: 'X' }).error).toBe('bad_time');
    expect(b.post({ ...base, title: 'X', calendarId: 'nope', start: 1, end: 2 }).error).toBe('calendar_not_found');
    expect(b.created).toHaveLength(0);
  });

  it('answers bad JSON and unknown actions calmly', () => {
    const sb = b.sandbox as unknown as { doPost: (e: unknown) => { text: string } };
    expect(JSON.parse(sb.doPost({ postData: { contents: '{' } }).text).error).toBe('bad_request');
    expect(b.post({ action: 'drop', key: KEY }).error).toBe('unknown_action');
  });
});
