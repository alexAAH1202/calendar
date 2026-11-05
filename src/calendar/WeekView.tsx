import { format, isSameDay } from 'date-fns';
import { dayKey } from '../date/dayKey';
import { useCalendarData } from './CalendarContext';
import { CalendarStatusLine } from './CalendarStatusLine';
import { eventsOn, weekDays } from './dates';
import { EventItem } from './EventItem';

/** Monday to Sunday as seven columns of events. */
export function WeekView({ now, anchor }: { now: Date; anchor: Date }) {
  const cal = useCalendarData();
  return (
    <section aria-label="Week">
      <div className="week">
        {weekDays(anchor).map((d) => {
          const key = dayKey(d);
          const list = eventsOn(cal.events, key);
          return (
            <div key={key} className={`week-day ${isSameDay(d, now) ? 'is-today' : ''}`}>
              <h3>
                <span className="week-dow">{format(d, 'EEE')}</span> <span className="week-date">{format(d, 'd')}</span>
                {isSameDay(d, now) && <span className="visually-hidden"> (today)</span>}
              </h3>
              {list.length ? (
                <ul className="events">{list.map((e) => <EventItem key={e.id} event={e} day={key} compact />)}</ul>
              ) : (
                <p className="hint hint--small">Free</p>
              )}
            </div>
          );
        })}
      </div>
      <CalendarStatusLine now={now} />
    </section>
  );
}
