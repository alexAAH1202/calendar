import { useEffect } from 'react';

/** Calls `onIdle` after `ms` with no touch, pointer or key input while `active`. */
export function useIdleExit(active: boolean, onIdle: () => void, ms = 120_000) {
  useEffect(() => {
    if (!active) return;
    let timer = window.setTimeout(onIdle, ms);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(onIdle, ms);
    };
    const events = ['pointerdown', 'touchstart', 'keydown'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [active, onIdle, ms]);
}
