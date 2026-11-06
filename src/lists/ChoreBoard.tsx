import { format } from 'date-fns';
import type { CSSProperties } from 'react';
import { ChildStep } from '../components/ChildStep';
import { Avatar } from '../components/Avatar';
import { PARENT_COLOUR, useFamilyInfo } from '../data/FamilyInfo';
import { PALETTES, TEXT_SIZES, profileOf } from '../data/profile';
import { useStore } from '../data/StoreContext';
import type { Person } from '../data/types';
import { doneOn, overdue, showsOn, tick, untick, type Chore } from './chores';
import { useItemList } from './useItemList';

/** The wall's Chores view: today's chores and to-dos for each child, then each parent. */
export function ChoreBoard({ children, day }: { children: Person[]; day: string }) {
  const { parents } = useFamilyInfo();
  const people: Person[] = [
    ...children,
    ...parents.map((p): Person => ({ id: p.id, name: p.name, role: 'parent', colour: PARENT_COLOUR })),
  ];
  return (
    <div className="child-board" style={{ gridTemplateColumns: `repeat(${people.length}, minmax(0, 1fr))` }}>
      {people.map((p) => <ChoreColumn key={p.id} person={p} day={day} />)}
    </div>
  );
}

function ChoreColumn({ person, day }: { person: Person; day: string }) {
  const store = useStore();
  const list = useItemList<Chore>(store, ['chores', person.id]);
  const profile = profileOf(person);
  const palette = PALETTES[profile.palette];
  const shown = list.items.filter((c) => showsOn(c, day));

  const setDone = (id: string, done: boolean) =>
    list.commit(list.current().map((c) => (c.id === id ? (done ? tick(c, day) : untick(c, day)) : c)), false);

  const style = {
    '--accent': person.colour,
    '--bg': palette.bg,
    '--surface': palette.surface,
    '--text': palette.text,
    '--muted': palette.muted,
    '--tint': `${palette.tint * 100}%`,
    '--child-text': `${person.role === 'child' ? TEXT_SIZES[profile.textSize] : 24}px`,
  } as CSSProperties;

  return (
    <section className="child-column motion-none" style={style} aria-label={`${person.name}’s chores`}>
      <header className="child-header">
        <Avatar name={person.name} colour={person.colour} image={person.avatar} size={56} />
        <h2>{person.name}</h2>
        <span className="child-tod">Chores</span>
      </header>
      {!list.loaded ? (
        <p className="hint">Loading…</p>
      ) : shown.length === 0 ? (
        <p className="hint">No chores today.</p>
      ) : (
        <ol className="steps">
          {shown.map((c) => (
            <ChildStep key={c.id} step={c} done={doneOn(c, day)} symbolMode={person.role === 'child' ? profile.symbolMode : 'symbolsText'}
              note={overdue(c, day) ? `From ${format(new Date(`${c.due}T12:00:00`), 'EEEE')}` : undefined}
              onSetDone={(d) => setDone(c.id, d)} />
          ))}
        </ol>
      )}
    </section>
  );
}
