import type { BridgeCalendar, BridgeSettings, CalEvent, NewEvent } from './types';

export type BridgeErrorKind = 'network' | 'unauthorised' | 'notBridge' | 'google';

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
    case 'notBridge':
      return 'That address did not answer like the calendar bridge. Check the deployment is a Web app with access for "Anyone".';
    default:
      return 'Google refused the request.';
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
      throw new BridgeError('network');
    }
    let data: { ok?: boolean; error?: string } & Record<string, unknown>;
    try {
      data = await res.json();
    } catch {
      throw new BridgeError('notBridge', `HTTP ${res.status}`);
    }
    if (data.ok) return data as T;
    if (data.error === 'unauthorised') throw new BridgeError('unauthorised');
    throw new BridgeError('google', String(data.error ?? 'unknown'));
  }

  return {
    calendars: async () => (await call<{ calendars: BridgeCalendar[] }>('calendars')).calendars,
    events: async (calendarIds: string[], from: number, to: number) =>
      (await call<{ events: CalEvent[] }>('events', { calendarIds, from, to })).events,
    create: async (event: NewEvent) => (await call<{ event: CalEvent }>('create', { ...event })).event,
  };
}

export type Bridge = ReturnType<typeof createBridge>;
