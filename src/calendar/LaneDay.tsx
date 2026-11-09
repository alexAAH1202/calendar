import { addDays, format, isSameDay } from 'date-fns';
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { Fragment, useState, type CSSProperties, type ReactNode } from 'react';
import { DayNote } from '../school/DayNote';
import { Avatar } from '../components/Avatar';
import { dayKey } from '../date/dayKey';
import { useCalendarData } from './CalendarContext';
import { eventsOn, timeLabel } from './dates';
import { dayWindow, lanesFor, packRows, place, shortTime, ticks, type TimeWindow } from './lanes';
import type { CalEvent } from './types';

const HOLD = { delay: 250, tolerance: 8 };
const EVERYONE_LANE = 'everyone';

/** Moves an event between rows: out of the row it was dragged from, into the one it was dropped on. */
export function reassign(current: string[], from: string, to: string): string[] {
  if (to === EVERYONE_LANE) return [];
  const rest = from === EVERYONE_LANE ? current : current.filter((id) => id !== from);
  return rest.includes(to) ? rest : [...rest, to];
}

function DragLabel({ id, lane, children }: { id: string; lane: string; children: (p: { setNodeRef: (el: HTMLElement | null) => void; props: Record<string, unknown>; dragging: boolean }) => ReactNode }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id, data: { lane } });
  return <>{children({ setNodeRef, props: { ...attributes, ...listeners }, dragging: isDragging })}</>;
}

function DropTrack({ lane, className, style, children }: { lane: string; className: string; style: CSSProperties; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: lane });
  return <div ref={setNodeRef} className={`${className} ${isOver ? 'is-over' : ''}`} style={style}>{children}</div>;
}

const ROW = 38; // px per stacked row of events

/** "Today", "Tomorrow", or the weekday. */
export function dayTitle(day: Date, now: Date): string {
  if (isSameDay(day, now)) return 'Today';
  if (isSameDay(day, addDays(now, 1))) return 'Tomorrow';
  return format(day, 'EEEE');
}

/**
 * One day as a timeline: a row for each person, events as bars across the day (several at once stack),
 * all-day events along the top. Events for several people show in each of their rows; events for nobody
 * in particular sit in the Everyone row, so nothing disappears.
 */
export function LaneDay({ day, now, onEdit, window: shared }: { day: Date; now: Date; onEdit?: (e: CalEvent) => void; window?: TimeWindow }) {
  const cal = useCalendarData();
  const key = dayKey(day);
  const events = eventsOn(cal.events, key);
  const allDay = events.filter((e) => e.allDay);
  const timed = events.filter((e) => !e.allDay);
  const win = shared ?? dayWindow(timed, key);
  const span = win.end - win.start;
  const lanes = lanesFor(timed, cal.lanePeople, cal.whoFor);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow = isSameDay(day, now) && nowMin >= win.start && nowMin <= win.end;
  const marks = ticks(win);
  const sensors = useSensors(useSensor(MouseSensor, { activationConstraint: HOLD }), useSensor(TouchSensor, { activationConstraint: HOLD }));
  const [dragging, setDragging] = useState<CalEvent | null>(null);
  const onDragEnd = (ev: DragEndEvent) => {
    setDragging(null);
    const event = events.find((x) => x.id === ev.active.id);
    const to = ev.over?.id as string | undefined;
    const from = ev.active.data.current?.lane as string | undefined;
    if (!event || !to || !from || to === from) return;
    cal.setWho(event, reassign(cal.whoFor(event), from, to));
  };
  const names = (e: CalEvent) => cal.whoFor(e).map((id) => cal.lanePeople.find((p) => p.id === id)?.name).filter(Boolean).join(', ');

  return (
    <section className="lane-day" aria-label={`${dayTitle(day, now)} ${format(day, 'd MMMM')}`}>
      <div className="lane-scroll">
        <DndContext sensors={sensors} onDragStart={(ev) => setDragging(events.find((x) => x.id === ev.active.id) ?? null)} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <div className="lane-inner">
          <header className="lane-head">
            <h3><span className={isSameDay(day, now) ? 'lane-today' : ''}>{dayTitle(day, now)}</span> <span className="lane-date">{format(day, 'd')}</span><DayNote day={dayKey(day)} holidays /></h3>
            {allDay.length > 0 && (
              <ul className="lane-allday" aria-label="All day">
                {allDay.map((e) => (
                  <li key={e.id}>
                    <button type="button" className="lane-chip" style={{ '--cal': cal.calendarFor(e)?.colour ?? '#9aa7b1' } as CSSProperties}
                      onClick={() => onEdit?.(e)} disabled={!onEdit} aria-label={`${e.title}, all day${names(e) ? `, for ${names(e)}` : ''}`}>
                      {e.title}
                      {cal.whoFor(e).slice(0, 4).map((id) => {
                        const p = cal.lanePeople.find((x) => x.id === id);
                        return p ? <Avatar key={id} name={p.name} colour={p.colour} image={p.avatar} size={22} /> : null;
                      })}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </header>

          <div className="lane-axis" aria-hidden="true">
            <span />
            <div className="lane-axis-track">
              {marks.map((m, i) => (
                <span key={m.label} className="lane-tick" style={{ left: `${m.at}%`, transform: i === 0 ? 'none' : 'translateX(-50%)' }}>{m.label}</span>
              ))}
            </div>
          </div>

          {lanes.map((lane) => {
            const { placed, rows } = packRows(lane.events, key);
            return (
              <div key={lane.person?.id ?? 'everyone'} className="lane-row">
                <div className="lane-name" style={{ '--who': lane.person?.colour ?? '#5f6b7a' } as CSSProperties}>
                  {lane.person ? <Avatar name={lane.person.name} colour={lane.person.colour} image={lane.person.avatar} size={30} /> : <span className="lane-home" aria-hidden="true">🏠</span>}
                  <span>{lane.person?.name ?? 'Everyone'}</span>
                </div>
                <DropTrack lane={lane.person?.id ?? EVERYONE_LANE} className="lane-track" style={{ height: rows * ROW + 6 }}>
                  {marks.map((m) => <span key={m.label} className="lane-grid" style={{ left: `${m.at}%` }} aria-hidden="true" />)}
                  {showNow && <span className="lane-now" style={{ left: `${((nowMin - win.start) / span) * 100}%` }} aria-hidden="true" />}
                  {placed.map(({ event, row }) => {
                    const pos = place(event, key, win);
                    const c = cal.calendarFor(event);
                    return (
                      <Fragment key={event.id}>
                        <span className="lane-bar" aria-hidden="true" style={{ left: `${pos.left}%`, width: `${pos.width}%`, top: row * ROW + 3, '--cal': c?.colour ?? '#9aa7b1' } as CSSProperties} />
                        <DragLabel id={event.id} lane={lane.person?.id ?? EVERYONE_LANE}>{({ setNodeRef, props, dragging: isDrag }) => (
                        <button type="button" ref={setNodeRef} {...props} className={`lane-label ${isDrag ? 'is-dragging' : ''}`} disabled={!onEdit} onClick={() => onEdit?.(event)}
                          style={{ left: `${pos.left}%`, top: row * ROW + 3, maxWidth: `${100 - pos.left}%`, '--cal': c?.colour ?? '#9aa7b1' } as CSSProperties}
                          aria-label={`${event.title}, ${timeLabel(event, key)}${c ? `, ${c.label} calendar` : ''}${names(event) ? `, for ${names(event)}` : ', for everyone'}`}>
                          <b>{shortTime(event.start!)}</b> {event.title}
                        </button>
                        )}</DragLabel>
                      </Fragment>
                    );
                  })}
                </DropTrack>
              </div>
            );
          })}
        </div>
        <DragOverlay>{dragging && <div className="lane-drag">{dragging.title}</div>}</DragOverlay>
        </DndContext>
      </div>
    </section>
  );
}
