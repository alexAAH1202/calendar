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
import { useState, type FormEvent } from 'react';
import { ConfirmButton } from '../components/ConfirmButton';
import { HOLD_TO_DRAG } from '../components/EditList';
import { noDrag } from '../components/EditStep';
import { Tabs } from '../components/Tabs';
import { useFamilyInfo } from '../data/FamilyInfo';
import { newId } from '../data/ids';
import { useStore } from '../data/StoreContext';
import {
  PRIORITIES,
  PRIORITY_LABELS,
  dropWithinGroup,
  inGroup,
  moveInGroup,
  moveToGroup,
  type DumpItem,
  type Priority,
} from './braindump';
import { ListNotices } from './ListNotices';
import { useItemList } from './useItemList';

const GROUP = 'group:';

/** Parent mode: the signed-in parent's brain dump in High, Medium and Low. */
export function BrainDump() {
  const { me, parents } = useFamilyInfo();
  const store = useStore();
  const list = useItemList<DumpItem>(store, ['braindump', me.id]);
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const items = list.items;
  const done = items.filter((i) => i.done);
  const commit = (next: DumpItem[]) => list.commit(next);

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
    if (overId.startsWith(GROUP)) return commit(moveToGroup(cur, id, overId.slice(GROUP.length) as Priority, null));
    const target = cur.find((i) => i.id === overId);
    if (!target || target.id === id) return;
    commit(target.priority === moving.priority ? dropWithinGroup(cur, id, overId) : moveToGroup(cur, id, target.priority, overId));
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const item: DumpItem = { id: newId('d'), text: text.trim(), priority, done: false };
    // Appended, then placed at the end of its own group: one change, one undo step.
    commit(moveToGroup([...list.current(), item], item.id, priority, null));
    setText('');
  };

  const change = (id: string, f: (i: DumpItem) => DumpItem) => commit(list.current().map((i) => (i.id === id ? f(i) : i)));

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
        <input id="dump-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Something on your mind…"
          aria-label="New brain dump item" />
        <Tabs<Priority> label="Priority for the new item" value={priority} onChange={setPriority}
          options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))} />
        <button type="submit" className="btn btn--primary" disabled={!text.trim()}>Add</button>
      </form>

      {!list.loaded ? <p className="hint">Loading…</p> : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <div className="dump-groups">
            {PRIORITIES.map((p) => (
              <DumpGroup key={p} priority={p} items={inGroup(items, p)} expandedId={expandedId}
                onToggleMore={(id) => setExpandedId((cur) => (cur === id ? null : id))}
                onUp={(id) => commit(moveInGroup(list.current(), id, -1))}
                onDown={(id) => commit(moveInGroup(list.current(), id, 1))}
                onMoveTo={(id, to) => { commit(moveToGroup(list.current(), id, to, null)); setExpandedId(null); }}
                onDone={(id) => change(id, (i) => ({ ...i, done: true }))}
                onDelete={(id) => { commit(list.current().filter((i) => i.id !== id)); setExpandedId(null); }} />
            ))}
          </div>
        </DndContext>
      )}

      {done.length > 0 && (
        <section className="panel" aria-label="Done">
          <button type="button" className="btn" aria-expanded={showDone} onClick={() => setShowDone((s) => !s)}>
            Done ({done.length})
          </button>
          {showDone && (
            <>
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
            </>
          )}
        </section>
      )}
    </>
  );
}

interface GroupProps {
  priority: Priority;
  items: DumpItem[];
  expandedId: string | null;
  onToggleMore: (id: string) => void;
  onUp: (id: string) => void;
  onDown: (id: string) => void;
  onMoveTo: (id: string, to: Priority) => void;
  onDone: (id: string) => void;
  onDelete: (id: string) => void;
}

function DumpGroup({ priority, items, ...rest }: GroupProps) {
  const { setNodeRef, isOver } = useDroppable({ id: GROUP + priority });
  return (
    <section className={`dump-group dump-group--${priority} ${isOver ? 'is-over' : ''}`} aria-label={`${PRIORITY_LABELS[priority]} priority`}>
      <h4>{PRIORITY_LABELS[priority]} <span className="dump-count">({items.length})</span></h4>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ol ref={setNodeRef} className="steps dump-list">
          {items.map((item, i) => (
            <DumpRow key={item.id} item={item} index={i} count={items.length} expanded={rest.expandedId === item.id} {...rest} />
          ))}
          {items.length === 0 && <li className="dump-empty">Drop here</li>}
        </ol>
      </SortableContext>
    </section>
  );
}

function DumpRow({ item, index, count, expanded, onToggleMore, onUp, onDown, onMoveTo, onDone, onDelete }:
  Omit<GroupProps, 'priority' | 'items' | 'expandedId'> & { item: DumpItem; index: number; count: number; expanded: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <li ref={setNodeRef} className={`step step--edit dump-item ${isDragging ? 'step--dragging' : ''}`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes} {...listeners} aria-roledescription="sortable item"
      aria-label={`${item.text}, ${PRIORITY_LABELS[item.priority]} priority, ${index + 1} of ${count}. Hold to drag.`}>
      <button type="button" className="tick-btn" {...noDrag} onClick={() => onDone(item.id)} aria-label={`Done: ${item.text}`} />
      <span className="step-title">{item.text}</span>
      <span className="edit-buttons">
        <button type="button" className="icon-btn" {...noDrag} onClick={() => onUp(item.id)} disabled={index === 0}
          aria-label={`Move ${item.text} up`}>▲</button>
        <button type="button" className="icon-btn" {...noDrag} onClick={() => onDown(item.id)} disabled={index === count - 1}
          aria-label={`Move ${item.text} down`}>▼</button>
        <button type="button" className="icon-btn" {...noDrag} onClick={() => onToggleMore(item.id)} aria-expanded={expanded}
          aria-label={`More for ${item.text}`}>⋯</button>
      </span>
      {expanded && (
        <div className="step-actions" {...noDrag}>
          {PRIORITIES.filter((p) => p !== item.priority).map((p) => (
            <button key={p} type="button" className="btn" onClick={() => onMoveTo(item.id, p)}>Move to {PRIORITY_LABELS[p]}</button>
          ))}
          <ConfirmButton confirmText="Tap again to delete" onConfirm={() => onDelete(item.id)}>Delete</ConfirmButton>
        </div>
      )}
    </li>
  );
}
