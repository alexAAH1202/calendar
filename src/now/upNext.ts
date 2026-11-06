import type { CalEvent } from '../calendar/types';

/** Minutes of travel kept for an event (eventExtras/{key}), by its Google event id. */
export type TravelMinutes = Record<string, number>;

/** Firestore-safe key for an event's extras: one per Google event, so a repeating event shares it. */
export const extrasKey = (e: Pick<CalEvent, 'eventId' | 'id'>) => (e.eventId ?? e.id.split('|')[0]).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 140);

export interface UpNext {
  event: CalEvent;
  /** When to leave (start minus travel), epoch ms. Equals start when there is no travel time. */
  leaveAt: number;
  travel: number;
}

/**
 * The next timed event today that has not started yet, with its leave time.
 * All-day events are not "up next"; they show in the day's list.
 */
export function upNext(events: CalEvent[], now: Date, travel: TravelMinutes): UpNext | undefined {
  const t = now.getTime();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const next = events
    .filter((e) => !e.allDay && e.start !== undefined && e.start > t && e.start < end)
    .sort((a, b) => a.start! - b.start!)[0];
  if (!next) return undefined;
  const minutes = travel[extrasKey(next)] ?? 0;
  return { event: next, travel: minutes, leaveAt: next.start! - minutes * 60_000 };
}

export type Urgency = 'later' | 'soon' | 'verySoon' | 'now';

/** How close a deadline is: more than 15 min, 15 or less, 5 or less, 1 or less (or passed). */
export function urgency(msLeft: number): Urgency {
  const min = msLeft / 60_000;
  if (min <= 1) return 'now';
  if (min <= 5) return 'verySoon';
  if (min <= 15) return 'soon';
  return 'later';
}

/** "25 min", "1 h 10 min", "1 min" (rounded up so it never says 0 while time remains). */
export function minutesText(msLeft: number): string {
  const m = Math.max(1, Math.ceil(msLeft / 60_000));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}

/** The words on the "up next" bar: never alarming, always the plain next action. */
export function leaveText(u: UpNext, now: Date): string {
  const left = u.leaveAt - now.getTime();
  const verb = u.travel ? 'leave' : 'starts';
  if (left <= 60_000) return u.travel ? 'Time to go' : 'Starting now';
  return `${verb} in ${minutesText(left)}`;
}

/** Minutes until a routine's "finish by" (HH:mm) today; negative once it has passed. */
export function finishByLeft(finishBy: string, now: Date): number {
  const [h, m] = finishBy.split(':').map(Number);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m).getTime() - now.getTime();
}
