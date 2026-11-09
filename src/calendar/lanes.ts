import type { Person } from '../data/types';
import { extrasKey } from '../now/upNext';
import type { CalEvent, FamilyCalendar } from './types';

/** A row on the family timeline: one person. */
export interface LanePerson {
  id: string;
  name: string;
  colour: string;
  avatar?: string;
  kind: 'adult' | 'child';
}

/** Event assignments kept in our own data (eventExtras/{key}.who), by extrasKey. */
export type WhoMap = Record<string, string[]>;

export const EVERYONE = 'everyone';

/** Colours for parents who are in the app but have no person of their own yet. */
const FALLBACK_ADULT_COLOURS = ['#7b5cc4', '#2f6fd6', '#c2477a', '#a8661f'];

const byOrder = (a: Person, b: Person) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name);
const first = (name: string) => name.trim().split(/\s+/)[0].toLowerCase();

/**
 * The people who get a row: adults first, then children. Adults come from the family's own adult
 * people (so Andrew can have a row without an account) plus any signed-in parent not already listed by name.
 */
export function buildLanePeople(people: Person[], parents: { id: string; name: string }[], colourOf: (c: string) => string = (c) => c): LanePerson[] {
  const adults: LanePerson[] = people
    .filter((p) => p.role === 'parent')
    .sort(byOrder)
    .map((p) => ({ id: p.id, name: p.name, colour: colourOf(p.colour), avatar: p.avatar, kind: 'adult' as const }));
  // Signed-in parents with no person of their own come first.
  const known = new Set(adults.map((a) => first(a.name)));
  const fromAccounts: LanePerson[] = [];
  parents.forEach((p, i) => {
    if (known.has(first(p.name))) return;
    fromAccounts.push({ id: p.id, name: p.name, colour: FALLBACK_ADULT_COLOURS[(adults.length + i) % FALLBACK_ADULT_COLOURS.length], kind: 'adult' });
    known.add(first(p.name));
  });
  adults.unshift(...fromAccounts);
  const kids: LanePerson[] = people
    .filter((p) => p.role === 'child')
    .sort(byOrder)
    .map((p) => ({ id: p.id, name: p.name, colour: colourOf(p.colour), avatar: p.avatar, kind: 'child' as const }));
  return [...adults, ...kids];
}

/**
 * Who an event is for. A choice made on the event itself wins (an empty list means "everyone");
 * otherwise the calendar's default people; otherwise everyone. People who no longer exist are ignored.
 */
export function assignedTo(e: CalEvent, who: WhoMap, calendar: FamilyCalendar | undefined, people: LanePerson[]): string[] {
  const known = new Set(people.map((p) => p.id));
  const explicit = who[extrasKey(e)];
  const ids = explicit !== undefined ? explicit : calendar?.defaultWho ?? [];
  return ids.filter((id) => known.has(id));
}

const MIN = 60_000;

/** Minutes after local midnight of `day` (yyyy-MM-dd), unclamped. */
const minutesOf = (ms: number, day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return (ms - new Date(y, m - 1, d).getTime()) / MIN;
};

export interface TimeWindow {
  /** Minutes after midnight. */
  start: number;
  end: number;
}

const DAY_START = 8 * 60;
const DAY_END = 20 * 60;

/** 8 am to 8 pm, widened to whole hours to hold every timed event of the day. */
export function dayWindow(timed: CalEvent[], day: string): TimeWindow {
  let start = DAY_START;
  let end = DAY_END;
  for (const e of timed) {
    if (e.start === undefined || e.end === undefined) continue;
    start = Math.min(start, Math.max(0, minutesOf(e.start, day)));
    end = Math.max(end, Math.min(24 * 60, minutesOf(e.end, day)));
  }
  start = Math.floor(start / 60) * 60;
  end = Math.min(24 * 60, Math.ceil(end / 60) * 60);
  return { start, end };
}

/** The window that holds both: days shown together share one time axis so their gridlines line up. */
export const unionWindow = (a: TimeWindow, b: TimeWindow): TimeWindow => ({ start: Math.min(a.start, b.start), end: Math.max(a.end, b.end) });

/** Where an event sits in the window, as percentages of its width. */
export function place(e: CalEvent, day: string, w: TimeWindow): { left: number; width: number } {
  const span = w.end - w.start;
  const s = Math.max(w.start, minutesOf(e.start!, day));
  const en = Math.min(w.end, minutesOf(e.end!, day));
  return { left: ((s - w.start) / span) * 100, width: (Math.max(en - s, 15) / span) * 100 };
}

/** Rough room a label needs after its start, in minutes of timeline, so labels do not run into each other. */
const labelMinutes = (e: CalEvent) => Math.min(240, Math.max(60, (e.title.length + 8) * 6));

export interface Placed {
  event: CalEvent;
  row: number;
}

/** Stacks events that would overlap into extra rows (earliest first, first row that is free). */
export function packRows(events: CalEvent[], day: string): { placed: Placed[]; rows: number } {
  const sorted = [...events].sort((a, b) => a.start! - b.start! || a.title.localeCompare(b.title));
  const rowEnds: number[] = [];
  const placed: Placed[] = [];
  for (const event of sorted) {
    const start = minutesOf(event.start!, day);
    const end = Math.max(minutesOf(event.end!, day), start + labelMinutes(event));
    let row = rowEnds.findIndex((e) => e <= start);
    if (row < 0) row = rowEnds.length;
    rowEnds[row] = end;
    placed.push({ event, row });
  }
  return { placed, rows: Math.max(1, rowEnds.length) };
}

export interface LaneContent {
  /** undefined for the "Everyone" row. */
  person?: LanePerson;
  events: CalEvent[];
}

/** Rows for a day: Everyone (events for nobody in particular) first, then each person; events for several people appear in each row. */
export function lanesFor(events: CalEvent[], people: LanePerson[], who: (e: CalEvent) => string[]): LaneContent[] {
  const rows: LaneContent[] = [{ events: [] }, ...people.map((person) => ({ person, events: [] as CalEvent[] }))];
  for (const e of events) {
    const ids = who(e);
    if (ids.length === 0) rows[0].events.push(e);
    else ids.forEach((id) => rows.find((r) => r.person?.id === id)?.events.push(e));
  }
  return rows;
}

/** "9am", "9:30am", "12pm" */
export function shortTime(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours() % 12 || 12;
  const m = d.getMinutes();
  return `${h}${m ? `:${String(m).padStart(2, '0')}` : ''}${d.getHours() < 12 ? 'am' : 'pm'}`;
}

/** Hour tick labels for a window, every two hours: "8am", "10am"… */
export function ticks(w: TimeWindow): { label: string; at: number }[] {
  const out: { label: string; at: number }[] = [];
  for (let m = Math.ceil(w.start / 120) * 120; m <= w.end; m += 120) {
    const h = Math.floor(m / 60) % 24;
    out.push({ label: `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`, at: ((m - w.start) / (w.end - w.start)) * 100 });
  }
  return out;
}
