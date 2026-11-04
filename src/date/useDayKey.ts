import { useEffect, useState } from 'react';
import { dayKey } from './dayKey';

/**
 * Current local date key. Re-checked every minute and whenever the app regains
 * focus or becomes visible, so the view swaps to a fresh day at midnight.
 */
export function useDayKey(now: () => Date = () => new Date()): string {
  const [key, setKey] = useState(() => dayKey(now()));

  useEffect(() => {
    const check = () => setKey((prev) => {
      const next = dayKey(now());
      return next === prev ? prev : next;
    });
    const timer = window.setInterval(check, 60_000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [now]);

  return key;
}
