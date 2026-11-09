import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FamilyStore } from '../data/store';
import { personColour } from '../data/profile';
import type { Person } from '../data/types';
import { assignedTo, buildLanePeople, type WhoMap } from './lanes';
import { BridgeError, createBridge, type BridgeErrorKind } from './bridge';
import { readCache, writeCache } from './cache';
import { fetchWindow } from './dates';
import type { BridgeSettings, CalEvent, FamilyCalendar, NewEvent } from './types';
import { extrasKey, type TravelMinutes } from '../now/upNext';

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
export function useCalendar(store: FamilyStore, parents: { id: string; name: string }[] = []) {
  const [settings, setSettings] = useState<BridgeSettings | undefined>();
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [calendars, setCalendars] = useState<FamilyCalendar[]>([]);
  const [calendarsLoaded, setCalendarsLoaded] = useState(false);
  const [parentNames, setParentNames] = useState<Record<string, string>>({});
  const [travel, setTravel] = useState<TravelMinutes>({});
  const [who, setWho] = useState<WhoMap>({});
  const [people, setPeople] = useState<Person[]>([]);
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
    () =>
      store.watchCollection<{ travelMinutes?: number | null; who?: string[] }>(['eventExtras'], (docs) => {
        setTravel(Object.fromEntries(docs.filter((d) => typeof d.travelMinutes === 'number').map((d) => [d.id, d.travelMinutes as number])));
        setWho(Object.fromEntries(docs.filter((d) => Array.isArray(d.who)).map((d) => [d.id, d.who as string[]])));
      }),
    [store],
  );
  useEffect(() => store.subscribePeople(setPeople), [store]);
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

  /** Changes one event; shows the change at once, then refreshes from Google. */
  const update = useCallback(
    async (original: CalEvent, changes: NewEvent) => {
      if (!bridge) throw new BridgeError('notBridge');
      try {
        const saved = await bridge.update(original, changes);
        setEvents((list) => [...list.filter((e) => e.id !== original.id), saved]);
        return saved;
      } finally {
        void refresh();
      }
    },
    [bridge, refresh],
  );

  const remove = useCallback(
    async (original: CalEvent) => {
      if (!bridge) throw new BridgeError('notBridge');
      try {
        await bridge.remove(original);
        setEvents((list) => list.filter((e) => e.id !== original.id));
      } finally {
        void refresh();
      }
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

  // Everyone who gets a row on the timeline: adults first, then children.
  const parentsKey = JSON.stringify(parents);
  const lanePeople = useMemo(() => buildLanePeople(people, parents, personColour), [people, parentsKey]); // parentsKey stands for parents
  const whoFor = useCallback(
    (e: CalEvent) => assignedTo(e, who, byGoogleId.get(e.calendarId), lanePeople),
    [who, byGoogleId, lanePeople],
  );

  return {
    lanePeople,
    /** The people (ids) an event is for; empty means everyone. Our own data, so it works on any event. */
    whoFor,
    /** True when the event has its own choice (otherwise it follows its calendar's default). */
    hasOwnWho: (e: CalEvent) => who[extrasKey(e)] !== undefined,
    setWho: (e: CalEvent, ids: string[]) => void store.putDoc(['eventExtras', extrasKey(e)], { who: ids }, true),
    /** Travel minutes set by hand for events (our own data, not Google's), by extrasKey; 0 means no travel. */
    travel,
    /** A number sets the travel time by hand (0: no travel); null goes back to automatic (Google Maps). */
    setTravel: (e: CalEvent, minutes: number | null) => void store.putDoc(['eventExtras', extrasKey(e)], { travelMinutes: minutes }, true),
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
    update,
    remove,
    bridge,
  };
}

export type CalendarData = ReturnType<typeof useCalendar>;
