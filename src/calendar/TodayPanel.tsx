import { DayNote } from '../school/DayNote';
import { addDays, format, isSameDay } from 'date-fns';
import { WeekStrip } from '../components/WeekStrip';
import { dayKey } from '../date/dayKey';
import { useCalendarData } from './CalendarContext';
import { CalendarStatusLine } from './CalendarStatusLine';
import { eventsOn } from './dates';
import { EventItem } from './EventItem';

/** Today's events, then tomorrow's, beside the children's routines. */
export function TodayPanel({ now, selected, onSelect }: { now: Date; selected: Date; onSelect: (d: Date) => void }) {
  const cal = useCalendarData();
  if (!cal.configured) return null;
  const today = dayKey(selected);
  const tomorrow = dayKey(addDays(selected, 1));
  const isToday = isSameDay(selected, now);
  const todays = eventsOn(cal.events, today);
  const tomorrows = eventsOn(cal.events, tomorrow);

  return (
    <aside className="today-panel" aria-label="Today’s events">
      <WeekStrip selected={selected} today={now} onSelect={onSelect} withControls={false} />
      <h2>{isToday ? 'Today' : format(selected, 'EEEE d')}<DayNote day={today} holidays /></h2>
      {todays.length ? (
        <ul className="events">{todays.map((e) => <EventItem key={e.id} event={e} day={today} />)}</ul>
      ) : (
        <p className="hint">Nothing on the calendar.</p>
      )}
      <h3>{isToday ? 'Tomorrow' : format(addDays(selected, 1), 'EEEE d')}</h3>
      {tomorrows.length ? (
        <ul className="events">{tomorrows.map((e) => <EventItem key={e.id} event={e} day={tomorrow} compact />)}</ul>
      ) : (
        <p className="hint">Nothing yet.</p>
      )}
      <CalendarStatusLine now={now} />
    </aside>
  );
}
