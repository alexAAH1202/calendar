import { format } from 'date-fns';

/** Black, with a small dim clock. A touch anywhere wakes the wall. */
export function SleepScreen({ now, onWake }: { now: Date; onWake: () => void }) {
  return (
    <div className="sleep-screen" role="button" tabIndex={0} aria-label="Sleeping. Touch to wake."
      onPointerDown={(e) => { e.preventDefault(); onWake(); }} onKeyDown={onWake}>
      <span className="sleep-clock">{format(now, 'h:mm')}</span>
    </div>
  );
}
