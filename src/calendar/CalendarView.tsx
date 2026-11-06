import { addMonths, addWeeks, format } from 'date-fns';
import { useState } from 'react';
import { dayKey } from '../date/dayKey';
import { bridgeErrorText } from './bridge';
import { useCalendarData } from './CalendarContext';
import { weekDays } from './dates';
import { EventSheet, type SheetTarget } from './EventSheet';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';

/** The Week and Month tabs: look through the calendar, add an event, tap one to change or delete it. */
export function CalendarView({ now, mode }: { now: Date; mode: 'week' | 'month' }) {
  const cal = useCalendarData();
  const [offset, setOffset] = useState(0);
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  if (!cal.configured) {
    return <p className="hint">No calendar connected yet. Hold Parent (⚙️ on a phone), then Calendar, to connect one.</p>;
  }
  const anchor = mode === 'week' ? addWeeks(now, offset) : addMonths(now, offset);
  const days = weekDays(anchor);
  const title = mode === 'week' ? `${format(days[0], 'd MMM')} – ${format(days[6], 'd MMM')}` : format(anchor, 'MMMM yyyy');

  return (
    <section aria-label={title}>
      <div className="editor-row">
        <h2 className="week-strip-month">{title}</h2>
        <div className="pill-group">
          <button type="button" className="pill pill--round" aria-label={`Previous ${mode}`} onClick={() => setOffset((o) => o - 1)}>‹</button>
          <button type="button" className="pill" disabled={offset === 0} onClick={() => setOffset(0)}>
            {mode === 'week' ? 'This week' : 'This month'}
          </button>
          <button type="button" className="pill pill--round" aria-label={`Next ${mode}`} onClick={() => setOffset((o) => o + 1)}>›</button>
          <button type="button" className="btn btn--primary" onClick={() => setSheet({ kind: 'new', day: dayKey(offset === 0 ? now : days[0]) })}>
            + Event
          </button>
        </div>
      </div>
      {cal.status.state === 'error' && (
        <p className="notice" role="status">
          {bridgeErrorText(cal.status.kind)}
          <button type="button" className="btn btn--small" onClick={() => void cal.refresh()}>Try again</button>
        </p>
      )}
      {mode === 'week' ? (
        <WeekView now={now} anchor={anchor} onEdit={(e) => setSheet({ kind: 'edit', event: e })} />
      ) : (
        <MonthView now={now} anchor={anchor} onPickDay={(d) => setSheet({ kind: 'new', day: dayKey(d) })} />
      )}
      {sheet && <EventSheet target={sheet} onClose={() => setSheet(null)} />}
    </section>
  );
}
