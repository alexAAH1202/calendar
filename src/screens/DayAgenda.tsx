import { format, isSameDay } from 'date-fns';
import { useState } from 'react';
import { useCalendarData } from '../calendar/CalendarContext';
import { eventsOn } from '../calendar/dates';
import { EventItem } from '../calendar/EventItem';
import { EventSheet, type SheetTarget } from '../calendar/EventSheet';
import { seedFor } from '../components/ChildColumn';
import { Avatar } from '../components/Avatar';
import { ChildStep } from '../components/ChildStep';
import { WeekStrip } from '../components/WeekStrip';
import { dayDocId, dayKey } from '../date/dayKey';
import { PARENT_COLOUR, useFamilyInfo } from '../data/FamilyInfo';
import { useStore } from '../data/StoreContext';
import { TIME_LABELS, routineId } from '../data/timeOfDay';
import { TIMES_OF_DAY, type Person } from '../data/types';
import { useDocs } from '../data/useDocs';
import { useRoutineSet } from '../data/useRoutineSet';
import { doneOn, overdue, showsOn, tick, untick, type Chore } from '../lists/chores';
import { starChange } from '../lists/stars';

interface AgendaItem {
  key: string;
  person: Person;
  title: string;
  image?: string;
  note: string;
  done: boolean;
  onSet?: (done: boolean) => void;
}

/**
 * One list for the whole family's day: calendar events, then everyone's routine
 * steps and chores still to do, then what is completed. Each card is tinted with
 * its person's colour and carries their initial.
 */
export function DayAgenda({ children, now }: { children: Person[]; now: Date }) {
  const store = useStore();
  const cal = useCalendarData();
  const { parents } = useFamilyInfo();
  const [selected, setSelected] = useState(now);
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  const today = dayKey(now);
  const key = dayKey(selected);
  const isToday = isSameDay(selected, now);

  const people: Person[] = [
    ...children,
    ...parents.map((p): Person => ({ id: p.id, name: p.name, role: 'parent', colour: PARENT_COLOUR })),
  ];
  const routines = useRoutineSet(store, children.flatMap((c) => TIMES_OF_DAY.map((t) => seedFor(c.id, t))));
  const days = useDocs<{ doneStepIds?: string[]; starredStepIds?: string[] }>(store, children.map((c) => ['days', dayDocId(today, c.id)]));
  const chores = useDocs<{ items?: Chore[] }>(store, people.map((p) => ['chores', p.id]));

  const items: AgendaItem[] = [];
  if (isToday) {
    for (const tod of TIMES_OF_DAY) {
      const lists = children.map((c) => routines.routines[routineId(c.id, tod)]?.steps ?? []);
      const longest = Math.max(0, ...lists.map((l) => l.length));
      for (let i = 0; i < longest; i++) {
        children.forEach((c, ci) => {
          const step = lists[ci][i];
          if (!step) return;
          const rec = days.docs[`days/${dayDocId(today, c.id)}`];
          const done = rec?.doneStepIds?.includes(step.id) ?? false;
          const alreadyStarred = rec?.starredStepIds?.includes(step.id) ?? false;
          items.push({
            key: `${c.id}_${step.id}`, person: c, title: step.title, image: step.image, note: TIME_LABELS[tod], done,
            onSet: (d) => void store.setStepDone(today, c.id, step.id, d, starChange({ done: d, alreadyStarred, stars: step.stars ?? 1 })),
          });
        });
      }
    }
  }
  for (const p of people) {
    const list = chores.docs[`chores/${p.id}`]?.items ?? [];
    for (const c of list) {
      const shows = isToday ? showsOn(c, key) : c.due === key && !c.done;
      if (!shows) continue;
      const setChore = (d: boolean) =>
        void store.putDoc(['chores', p.id], {
          items: list.map((x) => (x.id === c.id ? (d ? tick(x, today) : untick(x, today)) : x)),
          updatedAt: Date.now(),
        });
      items.push({
        key: `${p.id}_${c.id}`, person: p, title: c.title, image: c.image,
        note: overdue(c, key) ? `Chore · from ${format(new Date(`${c.due}T12:00:00`), 'EEEE')}` : 'Chore',
        done: isToday && doneOn(c, key), onSet: isToday ? setChore : undefined,
      });
    }
  }
  const todo = items.filter((i) => !i.done);
  const completed = items.filter((i) => i.done);
  const events = cal.configured ? eventsOn(cal.events, key) : [];
  const loaded = routines.loaded && days.loaded && chores.loaded;

  const card = (i: AgendaItem) => (
    <ChildStep key={i.key} step={{ id: i.key, title: i.title, image: i.image }} done={i.done} note={i.note}
      accent={i.person.colour} readOnly={!i.onSet} onSetDone={(d) => i.onSet?.(d)}
      badge={<Avatar name={i.person.name} colour={i.person.colour} image={i.person.avatar} size={48} />} />
  );

  return (
    <section className="agenda" aria-label={`The family’s ${format(selected, 'EEEE d MMMM')}`}>
      <WeekStrip selected={selected} today={now} onSelect={setSelected} />

      {cal.configured && (
        <>
          <div className="agenda-heading-row">
            <h2 className="agenda-heading">Calendar</h2>
            <button type="button" className="pill" onClick={() => setSheet({ kind: 'new', day: key })}>+ Event</button>
          </div>
          {events.length ? (
            <ul className="events">
              {events.map((e) => <EventItem key={e.id} event={e} day={key} onEdit={(ev) => setSheet({ kind: 'edit', event: ev })} />)}
            </ul>
          ) : (
            <p className="hint">Nothing on the calendar.</p>
          )}
        </>
      )}

      {sheet && <EventSheet target={sheet} onClose={() => setSheet(null)} />}
      {!loaded ? <p className="hint">Loading…</p> : (
        <>
          <h2 className="agenda-heading">{isToday ? 'To do' : 'Chores due'}</h2>
          {todo.length ? <ol className="steps">{todo.map(card)}</ol> : <p className="hint">{isToday ? 'All done.' : 'Nothing due.'}</p>}
          {completed.length > 0 && (
            <>
              <h2 className="agenda-heading">Completed</h2>
              <ol className="steps">{completed.map(card)}</ol>
            </>
          )}
        </>
      )}
    </section>
  );
}
