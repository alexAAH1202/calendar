import { useEffect, useState } from 'react';
import { useCalendarData } from '../calendar/CalendarContext';
import type { CalEvent } from '../calendar/types';
import { departGuess, occurrenceKey, shouldAsk, usesMaps, type MapsAnswer, type TravelSettings } from './travel';
import { extrasKey } from './upNext';

const KEY = 'fwc:mapsTravel';
const read = (): Record<string, MapsAnswer> => {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
};
const write = (all: Record<string, MapsAnswer>) => {
  try {
    // Keep only the last day or so of answers.
    const cutoff = Date.now() - 36 * 3600_000;
    window.localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(Object.entries(all).filter(([, a]) => a.fetchedAt > cutoff))));
  } catch {
    /* storage blocked: answers last until the page reloads */
  }
};

/**
 * Driving times from Google Maps for the next event, asked through the Apps Script on a schedule
 * (see shouldAsk) and kept on the device. Returns all answers known here, by occurrence.
 */
export function useMapsTravel(next: CalEvent | undefined, now: Date, s: TravelSettings): Record<string, MapsAnswer> {
  const cal = useCalendarData();
  const [answers, setAnswers] = useState<Record<string, MapsAnswer>>(read);
  const minute = Math.floor(now.getTime() / 60_000);

  useEffect(() => {
    if (!next || !cal.bridge || !usesMaps(next, s) || cal.travel[extrasKey(next)] !== undefined) return;
    const key = occurrenceKey(next);
    const cached = answers[key];
    if (!shouldAsk(next.start!, Date.now(), cached)) return;
    let stale = false;
    cal.bridge
      .travel(s.home, next.location, departGuess(next.start!, s.buffer, cached))
      .then((t) => {
        if (stale) return;
        const all = { ...read(), [key]: { minutes: t.minutes, traffic: t.traffic, distance: t.distance, fetchedAt: Date.now() } };
        write(all);
        setAnswers(all);
      })
      .catch(() => {
        /* no route or no connection: the last answer (or none) stays; asked again next minute */
      });
    return () => {
      stale = true;
    };
  }, [next?.id, next?.location, cal.bridge, s.on, s.home, s.buffer, minute]); // re-checked each minute; shouldAsk decides

  return answers;
}
