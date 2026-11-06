import { useEffect, useRef } from 'react';

/** When someone last touched the screen (or pressed a key), for "nobody is using it" checks. */
export function useLastInput(): () => number {
  const last = useRef(Date.now());
  useEffect(() => {
    const mark = () => (last.current = Date.now());
    const events = ['pointerdown', 'touchstart', 'keydown'] as const;
    events.forEach((e) => window.addEventListener(e, mark, { passive: true, capture: true }));
    return () => events.forEach((e) => window.removeEventListener(e, mark, { capture: true }));
  }, []);
  return () => last.current;
}
