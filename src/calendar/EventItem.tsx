import type { CSSProperties } from 'react';
import { Avatar } from '../components/Avatar';
import { useCalendarData } from './CalendarContext';
import { timeLabel } from './dates';
import type { CalEvent } from './types';

/** One event: calendar colour stripe plus its name in words, so colour is never the only cue. */
export function EventItem({ event, day, compact = false, onEdit }: {
  event: CalEvent;
  day: string;
  compact?: boolean;
  /** Parent devices: tapping the event opens it for changes. */
  onEdit?: (e: CalEvent) => void;
}) {
  const cal = useCalendarData();
  const c = cal.calendarFor(event);
  const by = cal.addedBy(event);
  return (
    <li className={`event ${compact ? 'event--compact' : ''} ${onEdit ? 'event--editable' : ''}`} style={{ '--cal': c?.colour ?? '#9aa7b1' } as CSSProperties}>
      {onEdit && (
        <button type="button" className="event-hit" aria-label={`Open ${event.title}, ${timeLabel(event, day)}`} onClick={() => onEdit(event)} />
      )}
      <span className="event-text">
        <span className="event-title">{event.title}</span>
        <span className="event-time">{timeLabel(event, day)}</span>
        {!compact && (
          <span className="event-meta">
            {c?.label}
            {by ? ` · added by ${by}` : ''}
            {event.location ? ` · ${event.location}` : ''}
          </span>
        )}
      </span>
      {!compact && c && <Avatar name={by ?? c.label} colour={c.colour} size={44} />}
    </li>
  );
}
