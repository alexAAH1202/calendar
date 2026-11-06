import type { CSSProperties } from 'react';
import { format, isSameDay, isSameMonth } from 'date-fns';
import { dayKey } from '../date/dayKey';
import { useCalendarData } from './CalendarContext';
import { CalendarStatusLine } from './CalendarStatusLine';
import { eventsOn, monthGrid, weekDays } from './dates';

const SHOWN = 3;

/** A six-week month grid with up to three event titles a day. */
export function MonthView({ now, anchor, onPickDay }: { now: Date; anchor: Date; onPickDay?: (d: Date) => void }) {
  const cal = useCalendarData();
  return (
    <section aria-label={format(anchor, 'MMMM yyyy')}>
      <div className="month">
        {weekDays(anchor).map((d) => (
          <div key={d.getDay()} className="month-dow" aria-hidden="true">{format(d, 'EEE')}</div>
        ))}
        {monthGrid(anchor).flat().map((d) => {
          const key = dayKey(d);
          const list = eventsOn(cal.events, key);
          return (
            <div key={key} className={`month-day ${isSameMonth(d, anchor) ? '' : 'is-other'} ${isSameDay(d, now) ? 'is-today' : ''}`}>
              {onPickDay ? (
                <button type="button" className="month-date month-date--btn" onClick={() => onPickDay(d)}
                  aria-label={`Add an event on ${format(d, 'EEEE d MMMM')}`}>{format(d, 'd')}</button>
              ) : (
                <span className="month-date">{format(d, 'd')}</span>
              )}
              <ul className="month-events">
                {list.slice(0, SHOWN).map((e) => (
                  <li key={e.id} style={{ '--cal': cal.calendarFor(e)?.colour ?? '#9aa7b1' } as CSSProperties}>{e.title}</li>
                ))}
                {list.length > SHOWN && <li className="month-more">+{list.length - SHOWN} more</li>}
              </ul>
            </div>
          );
        })}
      </div>
      <CalendarStatusLine now={now} />
    </section>
  );
}
