import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * A list that scrolls inside its own box, with a small "↓ more" marker while there is more below,
 * so a long routine fits on one screen and nothing is missed.
 */
export function ScrollList({ children, className = 'steps' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLOListElement>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', check);
      ro.disconnect();
    };
  }, []);
  return (
    <div className="scroll-list">
      <ol ref={ref} className={`${className} scroll-list-body`}>{children}</ol>
      {more && <span className="scroll-more" aria-hidden="true">↓ more</span>}
    </div>
  );
}
