import { addWeeks, format } from 'date-fns';
import { useEffect, useState } from 'react';
import { AddEventForm } from './AddEventForm';
import { useCalendarData } from './CalendarContext';
import { CalendarSetup } from './CalendarSetup';
import { bridgeErrorText } from './bridge';
import { weekDays } from './dates';
import { WeekView } from './WeekView';

/** Parent mode's Calendar tab: add an event, look through the weeks, connection settings. */
export function CalendarSection({ now }: { now: Date }) {
  const cal = useCalendarData();
  const ready = cal.configured;
  // Open while setting up, and stays open until the parent closes it.
  const [showSetup, setShowSetup] = useState(!ready);
  useEffect(() => {
    if (!ready) setShowSetup(true);
  }, [ready]);
  const [week, setWeek] = useState(0);
  const anchor = addWeeks(now, week);
  const days = weekDays(anchor);

  return (
    <>
      {cal.status.state === 'error' && (
        <p className="notice" role="status">
          {bridgeErrorText(cal.status.kind)}
          <button type="button" className="btn btn--small" onClick={() => void cal.refresh()}>Try again</button>
        </p>
      )}
      {ready && <AddEventForm />}
      {ready && (
        <>
          <div className="editor-row">
            <h3 className="week-title">{format(days[0], 'd MMM')} – {format(days[6], 'd MMM')}</h3>
            <div className="toolbar">
              <button type="button" className="btn" onClick={() => setWeek((w) => w - 1)} aria-label="Previous week">◀</button>
              <button type="button" className="btn" onClick={() => setWeek(0)} disabled={week === 0}>This week</button>
              <button type="button" className="btn" onClick={() => setWeek((w) => w + 1)} aria-label="Next week">▶</button>
              <button type="button" className="btn" onClick={() => void cal.refresh()}>Refresh</button>
            </div>
          </div>
          <WeekView now={now} anchor={anchor} />
        </>
      )}
      {showSetup ? (
        <>
          <CalendarSetup />
          {ready && <button type="button" className="btn" onClick={() => setShowSetup(false)}>Close calendar connection</button>}
        </>
      ) : (
        <button type="button" className="btn" onClick={() => setShowSetup(true)}>Calendar connection…</button>
      )}
    </>
  );
}
