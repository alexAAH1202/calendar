import { addWeeks, format, isSameDay } from 'date-fns';
import { weekDays } from '../calendar/dates';

interface Props {
  selected: Date;
  today: Date;
  onSelect: (d: Date) => void;
  /** Shows the month heading and the ‹ Today › buttons. */
  withControls?: boolean;
}

/** Monday to Sunday; the chosen day sits in a filled capsule. */
export function WeekStrip({ selected, today, onSelect, withControls = true }: Props) {
  return (
    <div className="week-strip">
      {withControls && (
        <div className="week-strip-top">
          <h2 className="week-strip-month">{format(selected, 'MMM, yyyy')}</h2>
          <div className="pill-group">
            <button type="button" className="pill pill--round" aria-label="Previous week" onClick={() => onSelect(addWeeks(selected, -1))}>‹</button>
            <button type="button" className="pill" disabled={isSameDay(selected, today)} onClick={() => onSelect(today)}>Today</button>
            <button type="button" className="pill pill--round" aria-label="Next week" onClick={() => onSelect(addWeeks(selected, 1))}>›</button>
          </div>
        </div>
      )}
      <div className="week-strip-days" role="group" aria-label="Day">
        {weekDays(selected).map((d) => {
          const on = isSameDay(d, selected);
          return (
            <button key={d.toISOString()} type="button" className={`strip-day ${on ? 'is-selected' : ''} ${isSameDay(d, today) ? 'is-today' : ''}`}
              aria-pressed={on} aria-label={format(d, 'EEEE d MMMM')} onClick={() => onSelect(d)}>
              <span className="strip-dow">{format(d, 'EEE')}</span>
              <span className="strip-date">{format(d, 'd')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
