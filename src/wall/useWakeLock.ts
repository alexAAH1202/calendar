import { useEffect, useState } from 'react';

/**
 * Keeps the screen on while the app is open (Screen Wake Lock API), asking again
 * whenever the page becomes visible, because the browser drops the lock when hidden.
 * Returns whether the lock is currently held.
 */
export function useWakeLock(enabled: boolean): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (!enabled || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | undefined;
    let stopped = false;
    const request = async () => {
      if (document.visibilityState !== 'visible' || (lock && !lock.released)) return;
      try {
        lock = await navigator.wakeLock.request('screen');
        if (stopped) return void lock.release();
        setHeld(true);
        lock.addEventListener('release', () => setHeld(false));
      } catch {
        setHeld(false); // refused (battery saver, not visible): tried again on the next visibility change
      }
    };
    void request();
    document.addEventListener('visibilitychange', request);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', request);
      void lock?.release();
    };
  }, [enabled]);
  return held;
}
