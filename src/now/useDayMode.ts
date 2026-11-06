import { useEffect, useState } from 'react';
import type { FamilyStore } from '../data/store';
import { modeFor, type DayMode, type DayModeDoc } from './dayMode';

/** Today's pace for the family (settings/day); back to normal by itself tomorrow. */
export function useDayMode(store: FamilyStore, today: string) {
  const [doc, setDoc] = useState<DayModeDoc>();
  useEffect(() => store.watchDoc<DayModeDoc>(['settings', 'day'], setDoc), [store]);
  return {
    mode: modeFor(doc, today),
    set: (mode: DayMode) => void store.putDoc(['settings', 'day'], { mode, date: today }),
  };
}
