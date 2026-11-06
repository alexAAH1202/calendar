import { useRef, type ReactNode } from 'react';

/**
 * A button that fires only after being held for `holdMs`. Used for "Parent"
 * so a passing tap from a child does not open edit mode. Not security; the
 * PIN arrives in a later phase.
 */
export function HoldButton({ holdMs = 1200, onHold, children, label }: {
  holdMs?: number;
  onHold: () => void;
  children: ReactNode;
  label: string;
}) {
  const timer = useRef<number | undefined>(undefined);
  const start = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(onHold, holdMs);
  };
  const cancel = () => window.clearTimeout(timer.current);

  return (
    <button
      type="button"
      className="hold-btn"
      title={`${label} (press and hold)`}
      aria-label={`${label} (press and hold)`}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onHold()}
    >
      {children}
    </button>
  );
}
