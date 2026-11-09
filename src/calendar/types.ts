/** One event as the bridge returns it. */
export interface CalEvent {
  /** Google's event id plus the occurrence start: unique per occurrence. */
  id: string;
  /** Google's own event id (missing from an out-of-date bridge script). */
  eventId?: string;
  /** Part of a repeating series: changed in Google Calendar, not from the wall. */
  recurring?: boolean;
  calendarId: string;
  title: string;
  location: string;
  /** Lower-case email of who added it, when Google says. */
  creator: string;
  allDay: boolean;
  /** Timed events: epoch ms. */
  start?: number;
  end?: number;
  /** All-day events: local dates, end exclusive. */
  startDate?: string;
  endDate?: string;
}

/** A Google calendar as the bridge lists it. */
export interface BridgeCalendar {
  id: string;
  name: string;
  colour: string;
  owned: boolean;
  primary: boolean;
  timeZone: string;
}

/** families/{fid}/calendars/{cid}: a calendar the family shows on the wall. */
export interface FamilyCalendar {
  id: string;
  googleId: string;
  /** Shown on the wall, e.g. "Alex", "Sam", "Family". */
  label: string;
  colour: string;
  /** New events may be added to it from the app. */
  writable: boolean;
  /** The shared family calendar: events show who added them. */
  shared: boolean;
  order: number;
  /** People (ids) whose events these are by default, e.g. Andrew's own calendar. An event can be reassigned. */
  defaultWho?: string[];
}

/** families/{fid}/settings/calendarBridge */
export interface BridgeSettings {
  url: string;
  key: string;
}

export interface NewEvent {
  calendarId: string;
  title: string;
  location?: string;
  allDay: boolean;
  start?: number;
  end?: number;
  startDate?: string;
  endDate?: string;
}

/** Which occurrence to change: the start in ms, or the start date for all-day events. */
export function occurrenceOf(e: CalEvent): number | string {
  return e.allDay ? e.startDate! : e.start!;
}
