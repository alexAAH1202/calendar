import { format } from 'date-fns';
import { useCalendarData } from './CalendarContext';

const STALE_MS = 60 * 60_000;

/** A small, calm line under the events: when they were last brought up to date. */
export function CalendarStatusLine({ now }: { now: Date }) {
  const { lastUpdated, status } = useCalendarData();
  if (status.state === 'notSetUp') return null;
  if (!lastUpdated) return status.state === 'error' ? <p className="cal-status">Calendar not loaded yet.</p> : null;
  const stale = now.getTime() - lastUpdated > STALE_MS;
  return (
    <p className="cal-status">
      {stale ? 'Calendar last updated ' : 'Updated '}
      {format(lastUpdated, stale && format(lastUpdated, 'yyyyMMdd') !== format(now, 'yyyyMMdd') ? 'EEE h:mm a' : 'h:mm a').toLowerCase()}
    </p>
  );
}
