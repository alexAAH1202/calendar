import { useEffect } from 'react';
import type { FamilyStore } from '../data/store';
import { dayKey } from '../date/dayKey';
import { reloadApp } from './pwa';
import { shouldReload } from './schedule';

const KEY = 'fwc:lastNightlyReload';

/**
 * Once a day, between 3 and 5 am, after five minutes with nobody touching the screen and
 * nothing waiting to sync, reload the app (picking up a new version if one is waiting).
 */
export function useNightlyReload(store: FamilyStore, enabled: boolean, lastInput: () => number) {
  useEffect(() => {
    if (!enabled) return;
    let busy = false;
    const check = async () => {
      if (busy) return;
      const now = new Date();
      let last: string | undefined;
      try {
        last = window.localStorage.getItem(KEY) ?? undefined;
      } catch {
        /* storage blocked: reload at most once per page load */
      }
      const base = { now, today: dayKey(now), lastReloadDay: last, idleMs: Date.now() - lastInput() };
      if (!shouldReload({ ...base, pendingWrites: false })) return;
      busy = true;
      const pendingWrites = await store.hasPendingWrites();
      busy = false;
      if (!shouldReload({ ...base, pendingWrites })) return;
      try {
        window.localStorage.setItem(KEY, base.today);
      } catch {
        /* see above */
      }
      void reloadApp();
    };
    const t = window.setInterval(() => void check(), 60_000);
    return () => window.clearInterval(t);
  }, [store, enabled, lastInput]);
}
