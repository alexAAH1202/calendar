import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ConfirmButton } from '../components/ConfirmButton';
import { HOLD_TO_DRAG } from '../components/EditList';
import { noDrag } from '../components/EditStep';
import { Tabs } from '../components/Tabs';
import { useFamilyInfo } from '../data/FamilyInfo';
import { newId } from '../data/ids';
import { useStore } from '../data/StoreContext';
import { dayKey } from '../date/dayKey';
import { moveItem } from '../ordering/order';
import {
  PRIORITIES,
  PRIORITY_LABELS,
  TODAY_LIMIT,
  archived,
  dropWithinGroup,
  inGroup,
  moveToGroup,
  nextStep,
  pickedToday,
  reminderDue,
  snoozed,
  togglePick,
  type DumpItem,
  type Priority,
} from './braindump';
import { ListNotices } from './ListNotices';
import { useItemList } from './useItemList';
import { VoiceButton } from './VoiceButton';

const GROUP = 'group:';
const niceDate = (key: string) => format(new Date(`${key}T12:00:00`), 'EEE d MMM');

/** Parent area: the signed-in parent's brain dump. Today's three, High / Medium / Low, reminders, an archive. */
export function BrainDump({ capture = false }: { capture?: boolean }) {
  const { me, parents } = useFamilyInfo();
  const store = useStore();
  const list = useItemList<DumpItem>(store, ['braindump', me.id]);
  const today = dayKey(new Date());
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [open, setOpen] = useState<'none' | 'done' | 'waiting' | 'archive'>('none');
  const [message, setMessage] = useState<string>();
  const input = useRef<HTMLInputElement>(null);
  const items = list.items;
  const now = Date.now();
  const visible = (i: DumpItem) => !i.done && !snoozed(i, today) && !archived(i, today, now);
  const picks = pickedToday(items, today);
  const due = items.filter((i) => reminderDue(i, today) && i.today !== today);
  const waiting = items.filter((i) => snoozed(i, today));
  const old = items.filter((i) => archived(i, today, now));
  const done = items.filter((i) => i.done);

  useEffect(() => {
    if (capture) input.current?.focus();
  }, [capture]);

  /** Every change marks the item as touched, so active items never drift into the archive. */
  const commit = (next: DumpItem[], touchedId?: string) =>
    list.commit(touchedId ? next.map((i) => (i.id === touchedId ? { ...i, touched: Date.now() } : i)) : next);
  const change = (id: string, f: (i: DumpItem) => DumpItem) => commit(list.current().map((i) => (i.id === id ? f(i) : i)), id);

  const pick = (id: string) => {
    const r = togglePick(list.current(), id, today);
    if (typeof r === 'string') return setMessage(r);
    setMessage(undefined);
    commit(r, id);
  };

  /** Arrows step over items hidden from the group (waiting, archived, done). */
  const moveVisible = (id: string, dir: -1 | 1) => {
    const cur = list.current();
    const item = cur.find((i) => i.id === id);
    if (!item) return;
    const group = cur.filter((i) => i.priority === item.priority && visible(i));
    const neighbour = group[group.findIndex((i) => i.id === id) + dir];
    if (neighbour) commit(moveItem(cur, cur.indexOf(item), cur.indexOf(neighbour)), id);
  };

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: HOLD_TO_DRAG }),
    useSensor(TouchSensor, { activationConstraint: HOLD_TO_DRAG }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over) return;
    const cur = list.current();
    const id = String(active.id);
    const overId = String(over.id);
    const moving = cur.find((i) => i.id === id);
    if (!moving) return;
    if (overId.startsWith(GROUP)) return commit(moveToGroup(cur, id, overId.slice(GROUP.length) as Priority, null), id);
    const target = cur.find((i) => i.id === overId);
    if (!target || target.id === id) return;
    commit(target.priority === moving.priority ? dropWithinGroup(cur, id, overId) : moveToGroup(cur, id, target.priority, overId), id);
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const item: DumpItem = { id: newId('d'), text: text.trim(), priority, done: false, touched: Date.now() };
    // Appended, then placed at the end of its own group: one change, one undo step.
    commit(moveToGroup([...list.current(), item], item.id, priority, null));
    setText('');
  };

  const rowProps = {
    today,
    expandedId,
    onToggleMore: (id: string) => setExpandedId((cur) => (cur === id ? null : id)),
    onUp: (id: string) => moveVisible(id, -1),
    onDown: (id: string) => moveVisible(id, 1),
    onMoveTo: (id: string, to: Priority) => { commit(moveToGroup(list.current(), id, to, null), id); setExpandedId(null); },
    onDone: (id: string) => change(id, (i) => ({ ...i, done: true })),
    onDelete: (id: string) => { commit(list.current().filter((i) => i.id !== id)); setExpandedId(null); },
    onPick: pick,
    onChange: change,
  };

  return (
    <>
      <div className="editor-row">
        <h3 className="week-title">{me.name}’s brain dump</h3>
        <div className="toolbar">
          <button type="button" className="btn" onClick={list.undo} disabled={!list.canUndo}>Undo</button>
        </div>
      </div>
      <p className="panel-text">
        The list of the parent signed in on this device. It shows on this screen to anyone using it and is not locked;
        {parents.length > 1 ? ' the other parent has their own on their phone, and' : ''} both parents’ accounts can technically read both lists.
      </p>
      <ListNotices list={list} />

      <form className="add-step dump-add" onSubmit={add}>
        <input id="dump-text" ref={input} value={text} onChange={(e) => setText(e.target.value)} placeholder="Something on your mind…"
          aria-label="New brain dump item" enterKeyHint="done" />
        <VoiceButton onText={(t) => setText((cur) => (cur ? `${cur} ${t}` : t))} />
        <Tabs<Priority> label="Priority for the new item" value={priority} onChange={setPriority}
          options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))} />
        <button type="submit" className="btn btn--primary" disabled={!text.trim()}>Add</button>
      </form>
      {message && <p className="notice notice--info" role="status">{message}</p>}

      <section className="dump-today" aria-label="Today’s three">
        <h4>Today’s {TODAY_LIMIT} <span className="dump-count">({picks.length} of {TODAY_LIMIT} picked)</span></h4>
        {picks.length === 0 ? (
          <p className="hint">Pick up to three things for today with ☆ on any item. The rest can wait.</p>
        ) : (
          <ol className="steps">
            {picks.map((i) => (
              <li key={i.id} className="step step--edit dump-item">
                <button type="button" className="tick-btn" onClick={() => rowProps.onDone(i.id)} aria-label={`Done: ${i.text}`} />
                <span className="step-title">
                  {i.text}
                  {nextStep(i) && <span className="step-meta">Next: {nextStep(i)!.text}</span>}
                </span>
                <button type="button" className="pill" onClick={() => pick(i.id)} aria-label={`Not today: ${i.text}`}>Not today</button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {due.length > 0 && (
        <section className="dump-due" aria-label="Reminders">
          <h4>⏰ Reminders</h4>
          <ul className="done-list">
            {due.map((i) => (
              <li key={i.id} className="dump-due-item">
                <span>{i.text}</span>
                <button type="button" className="pill" onClick={() => pick(i.id)}>☆ Pick for today</button>
                <button type="button" className="pill" onClick={() => change(i.id, ({ remindOn: _r, ...rest }) => rest)}>Clear reminder</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!list.loaded ? <p className="hint">Loading…</p> : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <div className="dump-groups">
            {PRIORITIES.map((p) => (
              <DumpGroup key={p} priority={p} items={inGroup(items, p).filter(visible)} {...rowProps} />
            ))}
          </div>
        </DndContext>
      )}

      <div className="dump-more">
        {waiting.length > 0 && (
          <button type="button" className="btn" aria-expanded={open === 'waiting'} onClick={() => setOpen((o) => (o === 'waiting' ? 'none' : 'waiting'))}>
            ⏰ Waiting for a date ({waiting.length})
          </button>
        )}
        {old.length > 0 && (
          <button type="button" className="btn" aria-expanded={open === 'archive'} onClick={() => setOpen((o) => (o === 'archive' ? 'none' : 'archive'))}>
            Archived ({old.length})
          </button>
        )}
        {done.length > 0 && (
          <button type="button" className="btn" aria-expanded={open === 'done'} onClick={() => setOpen((o) => (o === 'done' ? 'none' : 'done'))}>
            Done ({done.length})
          </button>
        )}
      </div>
      {open === 'waiting' && (
        <ul className="done-list panel">
          {waiting.map((i) => (
            <li key={i.id}>{i.text} <span className="step-meta">⏰ {niceDate(i.remindOn!)}</span>{' '}
              <button type="button" className="pill" onClick={() => change(i.id, ({ remindOn: _r, ...rest }) => rest)}>Show it now</button></li>
          ))}
        </ul>
      )}
      {open === 'archive' && (
        <div className="panel">
          <p className="panel-text">Low items nobody touched for three weeks. Nothing is deleted.</p>
          <ul className="done-list">
            {old.map((i) => (
              <li key={i.id}>{i.text}{' '}<button type="button" className="pill" onClick={() => change(i.id, (x) => x)}>Bring back</button></li>
            ))}
          </ul>
        </div>
      )}
      {open === 'done' && (
        <div className="panel">
          <ul className="done-list">
            {done.map((i) => (
              <li key={i.id}>
                <button type="button" className="btn btn--small" onClick={() => change(i.id, (x) => ({ ...x, done: false }))}
                  aria-label={`Not done: ${i.text}`}>↩</button> {i.text}
              </li>
            ))}
          </ul>
          <ConfirmButton className="btn" confirmText="Tap again to clear" onConfirm={() => commit(list.current().filter((i) => !i.done))}>
            Clear done
          </ConfirmButton>
        </div>
      )}
    </>
  );
}

interface RowHandlers {
  today: string;
  expandedId: string | null;
  onToggleMore: (id: string) => void;
  onUp: (id: string) => void;
  onDown: (id: string) => void;
  onMoveTo: (id: string, to: Priority) => void;
  onDone: (id: string) => void;
  onDelete: (id: string) => void;
  onPick: (id: string) => void;
  onChange: (id: string, f: (i: DumpItem) => DumpItem) => void;
}

function DumpGroup({ priority, items, ...rest }: RowHandlers & { priority: Priority; items: DumpItem[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: GROUP + priority });
  return (
    <section className={`dump-group dump-group--${priority} ${isOver ? 'is-over' : ''}`} aria-label={`${PRIORITY_LABELS[priority]} priority`}>
      <h4>{PRIORITY_LABELS[priority]} <span className="dump-count">({items.length})</span></h4>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ol ref={setNodeRef} className="steps dump-list">
          {items.map((item, i) => (
            <DumpRow key={item.id} item={item} index={i} count={items.length} {...rest} />
          ))}
          {items.length === 0 && <li className="dump-empty">Drop here</li>}
        </ol>
      </SortableContext>
    </section>
  );
}

function DumpRow({ item, index, count, today, expandedId, onToggleMore, onUp, onDown, onMoveTo, onDone, onDelete, onPick, onChange }:
  RowHandlers & { item: DumpItem; index: number; count: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const expanded = expandedId === item.id;
  const picked = item.today === today;
  const next = nextStep(item);
  const [stepText, setStepText] = useState('');
  const steps = item.steps ?? [];

  const addStep = (e: FormEvent) => {
    e.preventDefault();
    if (!stepText.trim()) return;
    onChange(item.id, (i) => ({ ...i, steps: [...(i.steps ?? []), { id: newId('ss'), text: stepText.trim(), done: false }] }));
    setStepText('');
  };

  return (
    <li ref={setNodeRef} className={`step step--edit dump-item ${isDragging ? 'step--dragging' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes} {...listeners} aria-roledescription="sortable item"
      aria-label={`${item.text}, ${PRIORITY_LABELS[item.priority]} priority, ${index + 1} of ${count}. Hold to drag.`}>
      <button type="button" className="tick-btn" {...noDrag} onClick={() => onDone(item.id)} aria-label={`Done: ${item.text}`} />
      <span className="step-title">
        {item.text}
        {next && <span className="step-meta">Next: {next.text}</span>}
        {item.remindOn && <span className="step-meta">⏰ {niceDate(item.remindOn)}</span>}
      </span>
      <span className="edit-buttons">
        <button type="button" className={`icon-btn ${picked ? 'icon-btn--on' : ''}`} {...noDrag} onClick={() => onPick(item.id)}
          aria-pressed={picked} aria-label={picked ? `Unpick from today: ${item.text}` : `Pick for today: ${item.text}`}>{picked ? '★' : '☆'}</button>
        <button type="button" className="icon-btn" {...noDrag} onClick={() => onUp(item.id)} disabled={index === 0}
          aria-label={`Move ${item.text} up`}>▲</button>
        <button type="button" className="icon-btn" {...noDrag} onClick={() => onDown(item.id)} disabled={index === count - 1}
          aria-label={`Move ${item.text} down`}>▼</button>
        <button type="button" className="icon-btn" {...noDrag} onClick={() => onToggleMore(item.id)} aria-expanded={expanded}
          aria-label={`More for ${item.text}`}>⋯</button>
      </span>
      {expanded && (
        <div className="step-actions dump-actions" {...noDrag}>
          <div className="breakdown">
            <span className="field-label">Break it down</span>
            {steps.length > 0 && (
              <ul className="substeps">
                {steps.map((s) => (
                  <li key={s.id}>
                    <label className="check">
                      <input type="checkbox" checked={s.done}
                        onChange={(e) => onChange(item.id, (i) => ({ ...i, steps: (i.steps ?? []).map((x) => (x.id === s.id ? { ...x, done: e.target.checked } : x)) }))} />
                      <span className={s.done ? 'substep-done' : ''}>{s.text}</span>
                    </label>
                    <button type="button" className="pill" aria-label={`Remove step ${s.text}`}
                      onClick={() => onChange(item.id, (i) => ({ ...i, steps: (i.steps ?? []).filter((x) => x.id !== s.id) }))}>✕</button>
                  </li>
                ))}
              </ul>
            )}
            <form className="add-step" onSubmit={addStep}>
              <input value={stepText} onChange={(e) => setStepText(e.target.value)} aria-label={`Small step for ${item.text}`}
                placeholder={steps.length ? 'Next small step…' : 'The first tiny step (e.g. find the form)'} />
              <button type="submit" className="btn" disabled={!stepText.trim()}>Add step</button>
            </form>
          </div>
          <label className="inline-field">
            Remind me on
            <input type="date" value={item.remindOn ?? ''} min={today}
              onChange={(e) => onChange(item.id, ({ remindOn: _r, ...rest }) => (e.target.value ? { ...rest, remindOn: e.target.value } : rest))} />
          </label>
          {PRIORITIES.filter((p) => p !== item.priority).map((p) => (
            <button key={p} type="button" className="btn" onClick={() => onMoveTo(item.id, p)}>Move to {PRIORITY_LABELS[p]}</button>
          ))}
          <ConfirmButton confirmText="Tap again to delete" onConfirm={() => onDelete(item.id)}>Delete</ConfirmButton>
        </div>
      )}
    </li>
  );
}
