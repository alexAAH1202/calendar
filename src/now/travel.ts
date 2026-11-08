import type { CalEvent } from '../calendar/types';
import { extrasKey, type TravelMinutes } from './upNext';

/** settings/travel: leave-by times from Google Maps (through the Apps Script). */
export interface TravelSettings {
  on: boolean;
  /** Home address, the starting point for every trip. */
  home: string;
  /** Minutes added for parking, shoes and getting out the door. */
  buffer: number;
}

export const DEFAULT_TRAVEL: TravelSettings = { on: true, home: '', buffer: 5 };

/** A driving time Maps gave for one occurrence of an event. */
export interface MapsAnswer {
  minutes: number;
  traffic: boolean;
  distance: string;
  fetchedAt: number;
}

/** The key for one occurrence (a repeating event's occurrences can have different traffic). */
export const occurrenceKey = (e: CalEvent) => `${extrasKey(e)}@${e.start ?? e.startDate}`;

const HOUR = 3600_000;

/**
 * Whether to ask Maps again: first within 6 hours of the start, then hourly,
 * and every 15 minutes in the last 90 minutes. Never after the event has started.
 */
export function shouldAsk(start: number, now: number, cached?: MapsAnswer): boolean {
  const until = start - now;
  if (until <= 0 || until > 6 * HOUR) return false;
  if (!cached) return true;
  const age = now - cached.fetchedAt;
  return age >= (until <= 1.5 * HOUR ? 15 * 60_000 : HOUR);
}

/** When to ask Maps about leaving: the last known leave time, or half an hour before the start. */
export function departGuess(start: number, buffer: number, cached?: MapsAnswer): number {
  return start - ((cached ? cached.minutes : 30) + buffer) * 60_000;
}

export interface Travel {
  minutes: number;
  /** "27 min drive + 5 min buffer", "30 min travel". */
  label: string;
  fromMaps: boolean;
}

/**
 * The travel time used for an event. A time set by hand on the event wins (0 means "no travel");
 * otherwise Maps' driving time plus the buffer, when Maps is on, home is set and the event has a place.
 */
export function travelFor(e: CalEvent, manual: TravelMinutes, maps: Record<string, MapsAnswer>, s: TravelSettings): Travel | undefined {
  const set = manual[extrasKey(e)];
  if (set !== undefined) return set > 0 ? { minutes: set, label: `${set} min travel`, fromMaps: false } : undefined;
  if (!usesMaps(e, s)) return undefined;
  const a = maps[occurrenceKey(e)];
  if (!a) return undefined;
  return {
    minutes: a.minutes + s.buffer,
    label: `${a.minutes} min drive${a.traffic ? ' (traffic)' : ''}${s.buffer ? ` + ${s.buffer} min buffer` : ''}`,
    fromMaps: true,
  };
}

export const usesMaps = (e: CalEvent, s: TravelSettings) => s.on && !!s.home.trim() && !!e.location.trim() && !e.allDay;
