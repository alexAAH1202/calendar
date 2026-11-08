/** Runs apps-script/Code.gs in a sandbox with fake Google services. */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { beforeEach, describe, expect, it } from 'vitest';

const KEY = 'k'.repeat(64);
const code = readFileSync('apps-script/Code.gs', 'utf8');

interface FakeEvent { id?: string; title: string; start: Date; end: Date; allDay?: boolean; creators?: string[]; location?: string; recurring?: boolean }

const fetched: string[] = [];
const directions: Record<string, unknown>[] = [];
let cacheStore: Record<string, string> = {};
const pages: Record<string, string> = {
  'https://www.recipetineats.com/honey-garlic-chicken/':
    '<html><script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage"},' +
    '{"@type":"Recipe","name":"Honey Garlic Chicken","totalTime":"PT12M","description":"<p>Sticky &amp; quick.</p>",' +
    '"recipeIngredient":["500g chicken breast","1/3 cup honey","2 tbsp butter"]}]}</script></html>',
  'https://example.com/no-recipe': '<html><script type="application/ld+json">{"@type":"Article"}</script></html>',
  'https://example.com/slow': '<script type="application/ld+json">[{"@type":["Recipe","Thing"],"name":"Stew","cookTime":"PT90M","recipeIngredient":["Beef"]}]</script>',
};

function load(props: Record<string, string> = { BRIDGE_KEY: KEY }) {
  const created: unknown[] = [];
  const events: FakeEvent[] = [
    { id: 'ev0@google.com', title: 'Swimming', start: new Date('2026-11-07T22:00:00Z'), end: new Date('2026-11-07T23:00:00Z'), creators: ['Alex@Example.com'] },
    { id: 'ev1@google.com', title: 'School holidays', start: new Date('2026-12-17T13:00:00Z'), end: new Date('2026-12-19T13:00:00Z'), allDay: true },
    { id: 'ev2@google.com', title: 'Piano', start: new Date('2026-11-08T06:00:00Z'), end: new Date('2026-11-08T07:00:00Z'), recurring: true },
  ];
  const toEvent = (e: FakeEvent, i: number) => ({
    getId: () => e.id ?? `ev${i}@google.com`,
    isRecurringEvent: () => !!e.recurring,
    setTitle: (t: string) => { e.title = t; },
    setLocation: (l: string) => { e.location = l; },
    setTime: (a: Date, b: Date) => { e.start = a; e.end = b; e.allDay = false; },
    setAllDayDate: (d: Date) => { e.start = d; e.end = new Date(d.getTime() + 86400000); e.allDay = true; },
    setAllDayDates: (a: Date, b: Date) => { e.start = a; e.end = b; e.allDay = true; },
    deleteEvent: () => { events.splice(events.indexOf(e), 1); },
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
      base64EncodeWebSafe: (t: string) => Buffer.from(t).toString('base64url'),
      // Sydney is UTC+11 in summer: enough for these tests.
      formatDate: (d: Date, _tz: string, _f: string) => new Date(d.getTime() + 11 * 3600000).toISOString().slice(0, 10),
      parseDate: (s: string) => new Date(new Date(`${s}T00:00:00Z`).getTime() - 11 * 3600000),
    },
    Logger: { log: () => {} },
    CacheService: { getScriptCache: () => ({ get: (k: string) => cacheStore[k] ?? null, put: (k: string, v: string) => { cacheStore[k] = v; } }) },
    Maps: {
      DirectionFinder: { Mode: { DRIVING: 'driving' } },
      newDirectionFinder: () => {
        const q: Record<string, unknown> = {};
        const f = {
          setOrigin: (o: string) => ((q.o = o), f),
          setDestination: (d: string) => ((q.d = d), f),
          setMode: (m: string) => ((q.m = m), f),
          setDepart: (t: Date) => ((q.t = t), f),
          getDirections: () => {
            directions.push(q);
            if (q.d === 'Nowhere') return { routes: [] };
            return { routes: [{ legs: [{ duration: { value: 1500 }, duration_in_traffic: q.d === 'Melton' ? { value: 1620 } : undefined,
              distance: { text: '24.1 km' }, end_address: `${q.d} VIC 3337, Australia` }] }] };
          },
        };
        return f;
      },
    },
    UrlFetchApp: {
      fetch: (url: string) => {
        fetched.push(url);
        const page = pages[url];
        return { getResponseCode: () => (page ? 200 : 404), getContentText: () => page ?? '' };
      },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  const post = (body: unknown) =>
    JSON.parse((sandbox as unknown as { doPost: (e: unknown) => { text: string } }).doPost({ postData: { contents: JSON.stringify(body) } }).text);
  return { sandbox: sandbox as unknown as Record<string, () => unknown>, post, created, props, events };
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

  const FAM = 'family@group.calendar.google.com';

  it('reports its version, so the wall can tell an out-of-date script', () => {
    expect(b.post({ action: 'version', key: KEY })).toEqual({ ok: true, version: 4 });
  });

  it('asks Maps for the driving time, with traffic when Maps has it, and keeps the answer for a while', () => {
    cacheStore = {};
    directions.length = 0;
    const departAt = Date.now() + 3600_000;
    const t = b.post({ action: 'travel', key: KEY, origin: '1 Home St, Caroline Springs', destination: 'Melton', departAt });
    expect(t).toEqual({ ok: true, travel: { minutes: 27, traffic: true, distance: '24.1 km', to: 'Melton VIC 3337, Australia' } });
    expect(directions[0]).toMatchObject({ o: '1 Home St, Caroline Springs', d: 'Melton', m: 'driving' });
    expect((directions[0].t as Date).getTime()).toBe(departAt);
    b.post({ action: 'travel', key: KEY, origin: '1 Home St, Caroline Springs', destination: 'Melton', departAt: departAt + 60_000 });
    expect(directions).toHaveLength(1); // same quarter hour: answered from the cache
    expect(b.post({ action: 'travel', key: KEY, origin: 'Home', destination: 'Footscray', departAt }).travel).toMatchObject({ minutes: 25, traffic: false });
  });

  it('refuses a missing place, an unroutable place and no key; never asks for a time in the past', () => {
    expect(b.post({ action: 'travel', key: KEY, origin: '', destination: 'Melton' }).error).toBe('place_missing');
    expect(b.post({ action: 'travel', key: KEY, origin: 'Home', destination: 'Nowhere', departAt: 1 }).error).toBe('no_route');
    expect((directions.at(-1)!.t as Date).getTime()).toBeGreaterThan(Date.now());
    expect(b.post({ action: 'travel', origin: 'Home', destination: 'Melton' }).error).toBe('unauthorised');
  });

  it('reads a recipe page’s schema.org Recipe (inside @graph or an array, any @type list)', () => {
    expect(b.post({ action: 'recipe', key: KEY, url: 'https://www.recipetineats.com/honey-garlic-chicken/' }).recipe).toEqual({
      name: 'Honey Garlic Chicken', time: '12 min', note: 'Sticky & quick.', url: 'https://www.recipetineats.com/honey-garlic-chicken/',
      ingredients: ['500g chicken breast', '1/3 cup honey', '2 tbsp butter'],
    });
    expect(b.post({ action: 'recipe', key: KEY, url: 'https://example.com/slow' }).recipe).toMatchObject({ name: 'Stew', time: '1 hr 30 min' });
  });

  it('refuses a page without a recipe, a missing page, a non-web address, and no key', () => {
    expect(b.post({ action: 'recipe', key: KEY, url: 'https://example.com/no-recipe' }).error).toBe('no_recipe_found');
    expect(b.post({ action: 'recipe', key: KEY, url: 'https://example.com/missing' }).error).toBe('page_404');
    const before = fetched.length;
    expect(b.post({ action: 'recipe', key: KEY, url: 'file:///etc/passwd' }).error).toBe('bad_url');
    expect(b.post({ action: 'recipe', url: 'https://example.com/slow' }).error).toBe('unauthorised');
    expect(fetched.length).toBe(before);
  });

  it('lists the raw event id and whether it repeats', () => {
    const res = b.post({ action: 'events', key: KEY, calendarIds: [FAM], from: Date.parse('2026-11-01T00:00:00Z'), to: Date.parse('2026-11-30T00:00:00Z') });
    expect(res.events.map((e: { eventId: string; recurring: boolean }) => [e.eventId, e.recurring])).toEqual([['ev0@google.com', false], ['ev2@google.com', true]]);
  });

  it('updates one timed event: title, place, time', () => {
    const res = b.post({ action: 'update', key: KEY, calendarId: FAM, fromCalendarId: FAM, eventId: 'ev0@google.com',
      occurrence: Date.parse('2026-11-07T22:00:00Z'), title: 'Swim squad', location: 'Aquatic centre', allDay: false,
      start: Date.parse('2026-11-07T21:30:00Z'), end: Date.parse('2026-11-07T22:30:00Z') });
    expect(res).toMatchObject({ ok: true, event: { title: 'Swim squad', location: 'Aquatic centre', start: Date.parse('2026-11-07T21:30:00Z') } });
    expect(b.events[0]).toMatchObject({ title: 'Swim squad' });
  });

  it('turns a timed event into an all-day one', () => {
    const res = b.post({ action: 'update', key: KEY, calendarId: FAM, fromCalendarId: FAM, eventId: 'ev0@google.com',
      occurrence: Date.parse('2026-11-07T22:00:00Z'), title: 'Swim carnival', allDay: true, startDate: '2026-11-08', endDate: '2026-11-09' });
    expect(res.event).toMatchObject({ allDay: true, startDate: '2026-11-08', endDate: '2026-11-09' });
  });

  it('finds an all-day event by its date', () => {
    const res = b.post({ action: 'update', key: KEY, calendarId: FAM, fromCalendarId: FAM, eventId: 'ev1@google.com',
      occurrence: '2026-12-18', title: 'Holidays!', allDay: true, startDate: '2026-12-18', endDate: '2026-12-21' });
    expect(res.event).toMatchObject({ title: 'Holidays!', startDate: '2026-12-18', endDate: '2026-12-21' });
  });

  it('deletes one event, and only that one', () => {
    expect(b.post({ action: 'delete', key: KEY, calendarId: FAM, eventId: 'ev0@google.com', occurrence: Date.parse('2026-11-07T22:00:00Z') }))
      .toEqual({ ok: true, deleted: true });
    expect(b.events.map((e) => e.title)).toEqual(['School holidays', 'Piano']);
  });

  it('refuses repeating events, a wrong occurrence, and a missing key', () => {
    expect(b.post({ action: 'delete', key: KEY, calendarId: FAM, eventId: 'ev2@google.com', occurrence: Date.parse('2026-11-08T06:00:00Z') }).error)
      .toBe('recurring_event');
    expect(b.post({ action: 'delete', key: KEY, calendarId: FAM, eventId: 'ev0@google.com', occurrence: Date.parse('2026-11-07T23:00:00Z') }).error)
      .toBe('event_not_found');
    expect(b.post({ action: 'delete', calendarId: FAM, eventId: 'ev0@google.com', occurrence: 1 }).error).toBe('unauthorised');
    expect(b.events).toHaveLength(3);
  });

  it('moves an event to another calendar by re-creating it there', () => {
    const res = b.post({ action: 'update', key: KEY, calendarId: FAM, fromCalendarId: FAM, eventId: 'ev0@google.com',
      occurrence: Date.parse('2026-11-07T22:00:00Z'), title: 'Swimming', allDay: false,
      start: Date.parse('2026-11-07T22:00:00Z'), end: Date.parse('2026-11-07T23:00:00Z') });
    expect(res.ok).toBe(true); // same calendar: plain update
    expect(b.post({ action: 'update', key: KEY, calendarId: 'nope', fromCalendarId: FAM, eventId: 'ev0@google.com',
      occurrence: Date.parse('2026-11-07T22:00:00Z'), title: 'X', allDay: false, start: 1, end: 2 }).error).toBe('calendar_not_found');
    expect(b.events).toHaveLength(3); // nothing deleted when the target calendar is wrong
  });

  it('answers bad JSON and unknown actions calmly', () => {
    const sb = b.sandbox as unknown as { doPost: (e: unknown) => { text: string } };
    expect(JSON.parse(sb.doPost({ postData: { contents: '{' } }).text).error).toBe('bad_request');
    expect(b.post({ action: 'drop', key: KEY }).error).toBe('unknown_action');
  });
});
