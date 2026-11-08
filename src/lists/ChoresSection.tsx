import { format } from 'date-fns';
import { useState, type FormEvent } from 'react';
import { ConfirmButton } from '../components/ConfirmButton';
import { EditList } from '../components/EditList';
import { DEFAULT_EMOJI } from '../components/emoji';
import { EmojiPicker } from '../components/EmojiPicker';
import { StepImage } from '../components/StepImage';
import { Tabs } from '../components/Tabs';
import { useFamilyInfo } from '../data/FamilyInfo';
import { newId } from '../data/ids';
import { useStore } from '../data/StoreContext';
import type { Person } from '../data/types';
import { moveById, moveDown, moveUp, removeById } from '../ordering/order';
import { ListNotices } from './ListNotices';
import { REPEAT_LABELS, choreStars, type Chore, type Repeat } from './chores';
import { useItemList } from './useItemList';

const nice = (key?: string) => (key ? format(new Date(`${key}T12:00:00`), 'EEE d MMM') : '');

/** "Every week · next Mon 9 Nov", "Once · Fri 13 Nov", "Once · any day", "Done". */
export function choreMeta(c: Chore): string {
  const essential = (c.essential ? ' · ✱ essential' : '') + (choreStars(c) ? ` · ${'⭐'.repeat(choreStars(c))}` : ' · no stars');
  if (c.repeat === 'none') return (c.done ? 'Done' : `Once · ${c.due ? nice(c.due) : 'any day'}`) + essential;
  return `${REPEAT_LABELS[c.repeat]} · next ${nice(c.due)}${essential}`;
}

/** Parent mode: chores and to-dos for each person. */
export function ChoresSection({ children, today }: { children: Person[]; today: string }) {
  const { parents } = useFamilyInfo();
  const people: { id: string; name: string; avatar?: string }[] = [
    ...children.map((c) => ({ id: c.id, name: c.name, avatar: c.avatar })),
    ...parents,
  ];
  const [personId, setPersonId] = useState<string | undefined>(people[0]?.id);
  const person = people.find((p) => p.id === personId) ?? people[0];
  if (!person) return <p className="hint">Add a child first.</p>;
  return (
    <>
      <div className="editor-row">
        <Tabs label="Person" value={person.id} onChange={setPersonId}
          options={people.map((p) => ({
            value: p.id,
            label: <>{p.avatar && <StepImage image={p.avatar} />} {p.name}</>,
          }))} />
      </div>
      <ChoreEditor key={person.id} personId={person.id} name={person.name} today={today} />
    </>
  );
}

type Picking = { kind: 'new' } | { kind: 'item'; id: string } | null;

function ChoreEditor({ personId, name, today }: { personId: string; name: string; today: string }) {
  const store = useStore();
  const list = useItemList<Chore>(store, ['chores', personId]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [picking, setPicking] = useState<Picking>(null);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState(DEFAULT_EMOJI);
  const [repeat, setRepeat] = useState<Repeat>('none');
  const [due, setDue] = useState(today);
  const [stars, setStars] = useState(1);
  const active = list.items.filter((c) => !c.done);
  const finished = list.items.filter((c) => c.done);

  const change = (id: string, f: (c: Chore) => Chore) => list.commit(list.current().map((c) => (c.id === id ? f(c) : c)));

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const chore: Chore = { id: newId('c'), title: title.trim(), image: `emoji:${emoji}`, repeat, done: false, stars };
    if (repeat !== 'none' || due) chore.due = due || today;
    list.commit([...list.current(), chore]);
    setTitle('');
    setEmoji(DEFAULT_EMOJI);
  };

  return (
    <>
      <div className="editor-row">
        <h3 className="week-title">{name}’s chores and to-dos</h3>
        <div className="toolbar">
          <button type="button" className="btn" onClick={list.undo} disabled={!list.canUndo}>Undo</button>
        </div>
      </div>
      <ListNotices list={list} />
      {!list.loaded ? <p className="hint">Loading…</p> : (
        <>
          {active.length === 0 && <p className="hint">Nothing yet. Add a chore or a to-do below.</p>}
          <EditList
            steps={active}
            expandedId={expandedId}
            metaFor={choreMeta}
            onDragMove={(a, b) => list.commit(moveById(list.current(), a, b))}
            onUp={(id) => list.commit(moveUp(list.current(), id))}
            onDown={(id) => list.commit(moveDown(list.current(), id))}
            onToggleMore={(id) => setExpandedId((cur) => (cur === id ? null : id))}
            onPickEmoji={(id) => setPicking({ kind: 'item', id })}
            actionsFor={(c) => (
              <>
                <label className="inline-field">
                  Repeat
                  <select value={c.repeat} onChange={(e) => {
                    const r = e.target.value as Repeat;
                    change(c.id, (x) => ({ ...x, repeat: r, due: x.due ?? (r === 'none' ? undefined : today) }));
                  }}>
                    {(Object.keys(REPEAT_LABELS) as Repeat[]).map((r) => <option key={r} value={r}>{REPEAT_LABELS[r]}</option>)}
                  </select>
                </label>
                <label className="inline-field">
                  {c.repeat === 'none' ? 'Due' : 'Next due'}
                  <input type="date" value={c.due ?? ''} onChange={(e) => change(c.id, (x) => ({ ...x, due: e.target.value || undefined }))} />
                </label>
                <label className="inline-field">
                  Stars earned
                  <select value={String(choreStars(c))} onChange={(e) => change(c.id, (x) => ({ ...x, stars: Number(e.target.value) }))}>
                    {[0, 1, 2, 3].map((v) => <option key={v} value={v}>{v ? '⭐'.repeat(v) : 'None'}</option>)}
                  </select>
                </label>
                <label className="check">
                  <input type="checkbox" checked={!!c.essential}
                    onChange={(e) => change(c.id, ({ essential: _e, ...x }) => (e.target.checked ? { ...x, essential: true } : x))} />
                  <span>Essential on low-energy days</span>
                </label>
                <ConfirmButton confirmText="Tap again to delete" onConfirm={() => { list.commit(removeById(list.current(), c.id)); setExpandedId(null); }}>
                  Delete
                </ConfirmButton>
              </>
            )}
          />
          <form className="add-step chore-form" onSubmit={add}>
            <button type="button" className="emoji-button" aria-label={`Symbol for the new chore: ${emoji}. Change`}
              onClick={() => setPicking({ kind: 'new' })}>{emoji}</button>
            <input id="chore-title" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={`New chore or to-do for ${name}`} aria-label="New chore or to-do" />
            <select id="chore-repeat" value={repeat} onChange={(e) => setRepeat(e.target.value as Repeat)} aria-label="Repeat">
              {(Object.keys(REPEAT_LABELS) as Repeat[]).map((r) => <option key={r} value={r}>{REPEAT_LABELS[r]}</option>)}
            </select>
            <input id="chore-due" type="date" value={due} onChange={(e) => setDue(e.target.value)}
              aria-label={repeat === 'none' ? 'Due (leave empty for any day)' : 'First due'} />
            <select id="chore-stars" value={String(stars)} onChange={(e) => setStars(Number(e.target.value))} aria-label="Stars earned">
              {[0, 1, 2, 3].map((v) => <option key={v} value={v}>{v ? `${'⭐'.repeat(v)} earned` : 'No stars'}</option>)}
            </select>
            <button type="submit" className="btn btn--primary" disabled={!title.trim()}>Add</button>
          </form>
          {picking && (
            <EmojiPicker
              value={picking.kind === 'item' ? list.items.find((c) => c.id === picking.id)?.image?.replace(/^emoji:/, '') ?? '' : emoji}
              onPick={(e) => {
                if (picking.kind === 'new') setEmoji(e);
                else change(picking.id, (c) => ({ ...c, image: `emoji:${e}` }));
                setPicking(null);
              }}
              onClose={() => setPicking(null)} />
          )}
          {finished.length > 0 && (
            <section className="panel" aria-label="Finished to-dos">
              <h3>Finished ({finished.length})</h3>
              <ul className="done-list">{finished.map((c) => <li key={c.id}>✓ {c.title}</li>)}</ul>
              <ConfirmButton className="btn" confirmText="Tap again to clear" onConfirm={() => list.commit(list.current().filter((c) => !c.done))}>
                Clear finished
              </ConfirmButton>
            </section>
          )}
        </>
      )}
    </>
  );
}
