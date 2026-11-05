import { addDays } from 'date-fns';
import { dayKey } from '../date/dayKey';
import { useCalendarData } from './CalendarContext';
import { CalendarStatusLine } from './CalendarStatusLine';
import { eventsOn } from './dates';
import { EventItem } from './EventItem';

/** Today's events, then tomorrow's, beside the children's routines. */
export function TodayPanel({ now }: { now: Date }) {
  const cal = useCalendarData();
  if (!cal.configured) return null;
  const today = dayKey(now);
  const tomorrow = dayKey(addDays(now, 1));
  const todays = eventsOn(cal.events, today);
  const tomorrows = eventsOn(cal.events, tomorrow);

  return (
    <aside className="today-panel" aria-label="Today’s events">
      <h2>Today</h2>
      {todays.length ? (
        <ul className="events">{todays.map((e) => <EventItem key={e.id} event={e} day={today} />)}</ul>
      ) : (
        <p className="hint">Nothing on the calendar.</p>
      )}
      <h3>Tomorrow</h3>
      {tomorrows.length ? (
        <ul className="events">{tomorrows.map((e) => <EventItem key={e.id} event={e} day={tomorrow} compact />)}</ul>
      ) : (
        <p className="hint">Nothing yet.</p>
      )}
      <CalendarStatusLine now={now} />
    </aside>
  );
}
