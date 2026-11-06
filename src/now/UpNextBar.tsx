import { format } from 'date-fns';
import type { CSSProperties } from 'react';
import { useCalendarData } from '../calendar/CalendarContext';
import { leaveText, minutesText, upNext, urgency } from './upNext';

/** How long before leaving the bar starts to shrink. */
const WINDOW_MS = 60 * 60_000;

/**
 * "Up next: Swimming at 4 pm · leave in 25 min", with a bar that shrinks over the last hour.
 * At 15, 5 and 1 minute the wording and weight step up; nothing flashes or moves on its own.
 */
export function UpNextBar({ now }: { now: Date }) {
  const cal = useCalendarData();
  if (!cal.configured) return null;
  const next = upNext(cal.events, now, cal.travel);
  if (!next) return null;
  const left = next.leaveAt - now.getTime();
  const level = urgency(left);
  const c = cal.calendarFor(next.event);
  const fraction = Math.max(0, Math.min(1, left / WINDOW_MS));
  return (
    <section className={`up-next up-next--${level}`} style={{ '--cal': c?.colour ?? '#9aa7b1' } as CSSProperties}
      aria-label={`Up next: ${next.event.title} at ${format(next.event.start!, 'h:mm a')}, ${leaveText(next, now)}`}>
      <span className="up-next-label">Up next</span>
      <span className="up-next-title">{next.event.title}</span>
      <span className="up-next-when">
        {format(next.event.start!, 'h:mm a').toLowerCase()}
        {next.travel ? ` · ${next.travel} min travel · leave ${format(next.leaveAt, 'h:mm a').toLowerCase()}` : ''}
      </span>
      <span className="up-next-left">{leaveText(next, now)}</span>
      <span className="up-next-bar" aria-hidden="true"><span style={{ width: `${fraction * 100}%` }} /></span>
      {level !== 'later' && left > 60_000 && (
        <span className="visually-hidden" role="status">{minutesText(left)} to go</span>
      )}
    </section>
  );
}
