import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FamilyStore } from '../data/store';
import { BridgeError, createBridge, type BridgeErrorKind } from './bridge';
import { readCache, writeCache } from './cache';
import { fetchWindow } from './dates';
import type { BridgeSettings, CalEvent, FamilyCalendar, NewEvent } from './types';

export const REFRESH_MS = 10 * 60_000;

export type CalendarStatus =
  | { state: 'notSetUp' }
  | { state: 'loading' }
  | { state: 'ok' }
  | { state: 'error'; kind: BridgeErrorKind };

/** Email keys cannot hold dots in a Firestore map, so they are stored with commas. */
export const emailKey = (email: string) => email.trim().toLowerCase().replace(/\./g, ',');

/**
 * Events from the family's calendars through the Apps Script bridge.
 * Refreshes every 10 minutes and when the app regains focus. The last result is
 * kept on the device, so the wall still shows events offline. No Firestore use for events.
 */
export function useCalendar(store: FamilyStore) {
  const [settings, setSettings] = useState<BridgeSettings | undefined>();
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [calendars, setCalendars] = useState<FamilyCalendar[]>([]);
  const [calendarsLoaded, setCalendarsLoaded] = useState(false);
  const [parentNames, setParentNames] = useState<Record<string, string>>({});
  const cached = useRef(readCache());
  const [events, setEvents] = useState<CalEvent[]>(cached.current?.events ?? []);
  const [lastUpdated, setLastUpdated] = useState<number | undefined>(cached.current?.fetchedAt);
  const [status, setStatus] = useState<CalendarStatus>({ state: 'loading' });

  useEffect(
    () =>
      store.watchDoc<BridgeSettings>(['settings', 'calendarBridge'], (s) => {
        setSettings(s?.url && s?.key ? s : undefined);
        setSettingsLoaded(true);
      }),
    [store],
  );
  useEffect(
    () =>
      store.watchCollection<FamilyCalendar>(['calendars'], (list) => {
        setCalendars([...list].sort((a, b) => a.order - b.order));
        setCalendarsLoaded(true);
      }),
    [store],
  );
  useEffect(
    () => store.watchDoc<{ emails?: Record<string, string> }>(['settings', 'parents'], (d) => setParentNames(d?.emails ?? {})),
    [store],
  );

  const bridge = useMemo(() => (settings ? createBridge(settings) : undefined), [settings]);
  const ids = calendars.map((c) => c.googleId);
  const idsKey = ids.join('|');

  const refresh = useCallback(async () => {
    if (!bridge || ids.length === 0) return;
    try {
      const { from, to } = fetchWindow(new Date());
      const list = await bridge.events(ids, from, to);
      const fetchedAt = Date.now();
      setEvents(list);
      setLastUpdated(fetchedAt);
      setStatus({ state: 'ok' });
      writeCache({ events: list, fetchedAt, calendarIds: idsKey });
    } catch (e) {
      setStatus({ state: 'error', kind: e instanceof BridgeError ? e.kind : 'network' });
    }
  }, [bridge, idsKey]); // idsKey stands for ids

  /** Both the bridge settings and the calendar list have been read once. */
  const known = settingsLoaded && calendarsLoaded;
  const configured = known && !!bridge && ids.length > 0;

  useEffect(() => {
    if (!known) return;
    if (!configured) {
      setStatus({ state: 'notSetUp' });
      return;
    }
    // Calendars changed since the cache was made: do not show events from removed ones.
    if (cached.current && cached.current.calendarIds !== idsKey) {
      setEvents((list) => list.filter((e) => ids.includes(e.calendarId)));
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    const onFocus = () => document.visibilityState === 'visible' && void refresh();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [known, configured, bridge, idsKey, refresh]); // idsKey stands for ids

  const create = useCallback(
    async (input: NewEvent) => {
      if (!bridge) throw new BridgeError('notBridge');
      const created = await bridge.create(input);
      setEvents((list) => [...list, created]);
      void refresh();
      return created;
    },
    [bridge, refresh],
  );

  const byGoogleId = useMemo(() => new Map(calendars.map((c) => [c.googleId, c])), [calendars]);
  /** Who added an event to the shared calendar, as a first name when known. */
  const addedBy = useCallback(
    (e: CalEvent) => {
      if (!byGoogleId.get(e.calendarId)?.shared || !e.creator) return undefined;
      return parentNames[emailKey(e.creator)] ?? e.creator.split('@')[0];
    },
    [byGoogleId, parentNames],
  );

  return {
    settings,
    /** False until it is known whether a calendar is set up, so the wall never redraws its layout on load. */
    known,
    configured,
    calendars,
    calendarFor: (e: CalEvent) => byGoogleId.get(e.calendarId),
    addedBy,
    events: events.filter((e) => byGoogleId.has(e.calendarId)),
    lastUpdated,
    status,
    refresh,
    create,
    bridge,
  };
}

export type CalendarData = ReturnType<typeof useCalendar>;
