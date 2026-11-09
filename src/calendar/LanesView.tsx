import { addDays, addWeeks, format } from 'date-fns';
import { useState, type CSSProperties } from 'react';
import { Tabs } from '../components/Tabs';
import { dayKey } from '../date/dayKey';
import { bridgeErrorText } from './bridge';
import { useCalendarData } from './CalendarContext';
import { eventsOn, weekDays } from './dates';
import { dayWindow, unionWindow } from './lanes';
import { EventSheet, type SheetTarget } from './EventSheet';
import { LaneDay } from './LaneDay';
import type { CalEvent } from './types';
import { WeekView } from './WeekView';

type Mode = 'days' | 'week';

/**
 * The Calendar tab: today and tomorrow as person-by-person timelines (or a week at a glance),
 * a legend of the calendars' colours, and the same add / change / delete as before.
 */
export function LanesView({ now }: { now: Date }) {
  const cal = useCalendarData();
  const [mode, setMode] = useState<Mode>('days');
  const [offset, setOffset] = useState(0);
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  if (!cal.configured) {
    return <p className="hint">No calendar connected yet. Hold Parent (⚙️ on a phone), then Calendar, to connect one.</p>;
  }
  const first = addDays(now, mode === 'days' ? offset : 0);
  const weekAnchor = addWeeks(now, mode === 'week' ? offset : 0);
  const week = weekDays(weekAnchor);
  const unit = mode === 'days' ? 'day' : 'week';
  const edit = (e: CalEvent) => setSheet({ kind: 'edit', event: e });
  // Both days share one time axis.
  const second = addDays(first, 1);
  const timedOn = (d: Date) => eventsOn(cal.events, dayKey(d)).filter((e) => !e.allDay);
  const shared = unionWindow(dayWindow(timedOn(first), dayKey(first)), dayWindow(timedOn(second), dayKey(second)));

  return (
    <section aria-label="Calendar" className="lanes-view">
      <div className="lanes-top">
        <ul className="lane-legend" aria-label="Calendars">
          {cal.calendars.map((c) => (
            <li key={c.id} style={{ '--cal': c.colour } as CSSProperties}><span className="lane-swatch" aria-hidden="true" /> {c.label}</li>
          ))}
        </ul>
        <div className="pill-group">
          <Tabs<Mode> label="Show" value={mode} onChange={(m) => { setMode(m); setOffset(0); }}
            options={[{ value: 'days', label: '2 days' }, { value: 'week', label: 'Week' }]} />
          <button type="button" className="pill pill--round" aria-label={`Previous ${unit}`} onClick={() => setOffset((o) => o - 1)}>‹</button>
          <button type="button" className="pill" disabled={offset === 0} onClick={() => setOffset(0)}>Today</button>
          <button type="button" className="pill pill--round" aria-label={`Next ${unit}`} onClick={() => setOffset((o) => o + 1)}>›</button>
          <button type="button" className="btn btn--primary" onClick={() => setSheet({ kind: 'new', day: dayKey(mode === 'days' ? first : week[0]) })}>+ Event</button>
        </div>
      </div>
      {cal.status.state === 'error' && (
        <p className="notice" role="status">
          {bridgeErrorText(cal.status.kind)}
          <button type="button" className="btn btn--small" onClick={() => void cal.refresh()}>Try again</button>
        </p>
      )}
      {mode === 'days' ? (
        <div className="lane-days">
          <LaneDay day={first} now={now} onEdit={edit} window={shared} />
          <LaneDay day={second} now={now} onEdit={edit} window={shared} />
        </div>
      ) : (
        <>
          <h2 className="week-strip-month">{format(week[0], 'd MMM')} – {format(week[6], 'd MMM')}</h2>
          <WeekView now={now} anchor={weekAnchor} onEdit={edit} />
        </>
      )}
      {sheet && <EventSheet target={sheet} onClose={() => setSheet(null)} />}
    </section>
  );
}
