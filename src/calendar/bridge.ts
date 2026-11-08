import { occurrenceOf, type BridgeCalendar, type BridgeSettings, type CalEvent, type NewEvent } from './types';

export type BridgeErrorKind = 'network' | 'unauthorised' | 'notBridge' | 'google' | 'access' | 'outdated' | 'recurring' | 'gone' | 'noRecipe' | 'noRoute';

export class BridgeError extends Error {
  constructor(public kind: BridgeErrorKind, detail = '') {
    super(detail || kind);
  }
}

const SCRIPT_URL = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/;
const TEST_URL = /^http:\/\/(localhost|127\.0\.0\.1):\d+\/[\w/-]*$/;

/** Only an Apps Script web app address is accepted, so the key is never sent anywhere else. */
export function validBridgeUrl(url: string, allowLocal = import.meta.env.VITE_USE_EMULATORS === '1'): boolean {
  return SCRIPT_URL.test(url.trim()) || (allowLocal && TEST_URL.test(url.trim()));
}

/** Plain-language text for each failure, for parent mode. */
export function bridgeErrorText(kind: BridgeErrorKind): string {
  switch (kind) {
    case 'network':
      return 'Could not reach Google. Check the Wi-Fi; the wall keeps showing the last events it had.';
    case 'unauthorised':
      return 'The calendar key was not accepted. Paste the key that setup() logged in Apps Script.';
    case 'access':
      return 'Google answered, but would not let the app read the reply. In Apps Script, open Deploy > Manage deployments > ✏️, set Who has access to "Anyone" (not "Anyone with Google account"), choose Version: New version, Deploy, then try again. To check: open the web app address in a private window; it should show {"ok":true,…}.';
    case 'outdated':
      return 'The Apps Script needs updating for this. Paste the latest Code.gs, then Deploy > Manage deployments > ✏️ > Version: New version > Deploy. The address stays the same.';
    case 'recurring':
      return 'This is a repeating event. Change or delete it in Google Calendar, where you can choose this one or all of them.';
    case 'noRoute':
      return 'Google Maps could not find a driving route. Check the home address and the event’s place.';
    case 'noRecipe':
      return 'No recipe could be read from that page. Check the address, or type the recipe in yourself.';
    case 'gone':
      return 'That event was already changed or deleted in Google. The list has been refreshed.';
    case 'notBridge':
      return 'That address did not answer like the calendar bridge. Check the deployment is a Web app with access for "Anyone".';
    default:
      return 'Google refused the request.';
  }
}

/**
 * After a blocked request: offline, or Google is reachable but the reply is not readable
 * (the deployment is not open to "Anyone", so Google sends a sign-in page instead).
 */
async function diagnose(url: string, fetchImpl: typeof fetch): Promise<BridgeErrorKind> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'network';
  try {
    // An opaque request succeeds whenever Google answers at all, whatever it answers with.
    await fetchImpl(url, { method: 'GET', mode: 'no-cors', credentials: 'omit' });
    return 'access';
  } catch {
    return 'network';
  }
}

/**
 * Talks to the Apps Script bridge. Requests are POSTs with a text/plain JSON body,
 * which needs no CORS preflight; Google answers with a redirect the browser follows.
 */
export function createBridge(settings: BridgeSettings, fetchImpl: typeof fetch = (...a) => fetch(...a)) {
  async function call<T>(action: string, body: Record<string, unknown> = {}): Promise<T> {
    if (!validBridgeUrl(settings.url)) throw new BridgeError('notBridge', 'bad url');
    let res: Response;
    try {
      res = await fetchImpl(settings.url.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ ...body, action, key: settings.key.trim() }),
        redirect: 'follow',
        credentials: 'omit',
      });
    } catch {
      throw new BridgeError(await diagnose(settings.url.trim(), fetchImpl));
    }
    let data: { ok?: boolean; error?: string } & Record<string, unknown>;
    try {
      data = await res.json();
    } catch {
      throw new BridgeError('notBridge', `HTTP ${res.status}`);
    }
    if (data.ok) return data as T;
    if (data.error === 'unauthorised') throw new BridgeError('unauthorised');
    if (data.error === 'unknown_action') throw new BridgeError('outdated');
    if (data.error === 'recurring_event') throw new BridgeError('recurring');
    if (data.error === 'event_not_found') throw new BridgeError('gone');
    if (data.error === 'no_route' || data.error === 'place_missing') throw new BridgeError('noRoute', String(data.error));
    if (data.error === 'no_recipe_found' || data.error === 'bad_url' || String(data.error).startsWith('page_')) throw new BridgeError('noRecipe', String(data.error));
    throw new BridgeError('google', String(data.error ?? 'unknown'));
  }

  return {
    calendars: async () => (await call<{ calendars: BridgeCalendar[] }>('calendars')).calendars,
    events: async (calendarIds: string[], from: number, to: number) =>
      (await call<{ events: CalEvent[] }>('events', { calendarIds, from, to })).events,
    create: async (event: NewEvent) => (await call<{ event: CalEvent }>('create', { ...event })).event,
    /** Changes one occurrence; a different calendarId moves it there. */
    update: async (original: CalEvent, changes: NewEvent) => {
      if (!original.eventId) throw new BridgeError('outdated');
      return (
        await call<{ event: CalEvent }>('update', {
          ...changes,
          fromCalendarId: original.calendarId,
          eventId: original.eventId,
          occurrence: occurrenceOf(original),
        })
      ).event;
    },
    /** Reads a recipe page through the Apps Script (version 3): name, time, note and ingredient lines. */
    recipe: async (url: string) =>
      (await call<{ recipe: { name: string; time: string; note: string; url: string; ingredients: string[] } }>('recipe', { url })).recipe,
    /** Driving time from home to a place, leaving at departAt (Apps Script version 4, Google Maps). */
    travel: async (origin: string, destination: string, departAt: number) =>
      (await call<{ travel: { minutes: number; traffic: boolean; distance: string; to: string } }>('travel', { origin, destination, departAt })).travel,
    remove: async (original: CalEvent) => {
      if (!original.eventId) throw new BridgeError('outdated');
      await call('delete', { calendarId: original.calendarId, eventId: original.eventId, occurrence: occurrenceOf(original) });
    },
  };
}

export type Bridge = ReturnType<typeof createBridge>;
