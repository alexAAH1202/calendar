import { useState, type FormEvent } from 'react';
import { seedFor } from '../components/ChildColumn';
import { ConfirmButton } from '../components/ConfirmButton';
import { EditList } from '../components/EditList';
import { DEFAULT_EMOJI } from '../components/emoji';
import { EmojiPicker } from '../components/EmojiPicker';
import { StepImage } from '../components/StepImage';
import { SyncNotices } from '../components/SyncNotices';
import { Tabs } from '../components/Tabs';
import { TemplatesPanel } from '../components/TemplatesPanel';
import { newId } from '../data/ids';
import { useStore } from '../data/StoreContext';
import { TIME_LABELS, routineId } from '../data/timeOfDay';
import { TIMES_OF_DAY, type Person, type TimeOfDay } from '../data/types';
import { useRoutineSet } from '../data/useRoutineSet';
import { useTemplates } from '../data/useTemplates';

/** The Routines tab: pick a child and a time of day, then change that list. */
export function RoutinesView({ children, currentTod }: { children: Person[]; currentTod: TimeOfDay }) {
  const [childId, setChildId] = useState<string | undefined>(children[0]?.id);
  const child = children.find((p) => p.id === childId) ?? children[0];
  if (!child) return <p className="hint">Add a child in Parent → Children first.</p>;
  return (
    <section className="edit-surface" aria-label="Routines">
      <div className="editor-row">
        <Tabs label="Child" value={child.id} onChange={setChildId}
          options={children.map((p) => ({ value: p.id, label: <>{p.avatar && <StepImage image={p.avatar} />} {p.name}</> }))} />
      </div>
      <RoutineEditor key={child.id} child={child} currentTod={currentTod} />
    </section>
  );
}

type Picking = { kind: 'new' } | { kind: 'step'; id: string } | null;

function RoutineEditor({ child, currentTod }: { child: Person; currentTod: TimeOfDay }) {
  const store = useStore();
  const [showTemplates, setShowTemplates] = useState(false);
  const templates = useTemplates(store);
  const [tod, setTod] = useState<TimeOfDay>(currentTod);
  const set = useRoutineSet(store, TIMES_OF_DAY.map((t) => seedFor(child.id, t)));
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [picking, setPicking] = useState<Picking>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newEmoji, setNewEmoji] = useState(DEFAULT_EMOJI);
  const rid = routineId(child.id, tod);
  const steps = set.routines[rid]?.steps ?? [];
  const listName = `${child.name}’s ${TIME_LABELS[tod].toLowerCase()}`;

  const addStep = (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    set.add(rid, newTitle.trim(), newEmoji);
    setNewTitle('');
    setNewEmoji(DEFAULT_EMOJI);
  };

  const pick = (emoji: string) => {
    if (picking?.kind === 'new') setNewEmoji(emoji);
    if (picking?.kind === 'step') set.setEmoji(rid, picking.id, emoji);
    setPicking(null);
  };

  return (
    <>
      <div className="editor-row">
        <Tabs<TimeOfDay> label="Time of day" value={tod} onChange={(t) => { setTod(t); setExpandedId(null); }}
          options={TIMES_OF_DAY.map((t) => ({
            value: t,
            label: `${TIME_LABELS[t]} (${set.routines[routineId(child.id, t)]?.steps.length ?? 0})`,
          }))} />
        <div className="toolbar">
          <button type="button" className="btn" onClick={set.undo} disabled={!set.canUndo}>Undo</button>
          <button type="button" className="btn" aria-expanded={showTemplates} onClick={() => setShowTemplates((s) => !s)}>
            Templates
          </button>
        </div>
      </div>

      {showTemplates && (
        <TemplatesPanel templates={templates} tod={tod} currentSteps={steps} listName={listName}
          onApply={(t, mode) => set.applyTemplate(rid, t.steps, mode)}
          onSave={(name) => void store.saveTemplate({ id: newId('t'), name, timeOfDay: tod, steps })}
          onDelete={(id) => void store.deleteTemplate(id)} />
      )}

      <SyncNotices routine={set} />

      {!set.loaded ? (
        <p className="hint">Loading…</p>
      ) : (
        <>
          <p className="hint">
            {steps.length === 0
              ? `${listName} is empty. Add a step below or use Templates.`
              : 'Hold a step to drag it, or use the arrows. Tap a symbol to change it; ⋯ for more.'}
          </p>
          <EditList
            steps={steps}
            expandedId={expandedId}
            onDragMove={(a, b) => set.dragMove(rid, a, b)}
            onUp={(id) => set.moveUp(rid, id)}
            onDown={(id) => set.moveDown(rid, id)}
            onToggleMore={(id) => setExpandedId((cur) => (cur === id ? null : id))}
            onPickEmoji={(id) => setPicking({ kind: 'step', id })}
            actionsFor={(step) => (
              <>
                {TIMES_OF_DAY.filter((t) => t !== tod).map((t) => (
                  <button key={t} type="button" className="btn"
                    onClick={() => { set.moveTo(rid, routineId(child.id, t), step.id); setExpandedId(null); }}>
                    Move to {TIME_LABELS[t].toLowerCase()}
                  </button>
                ))}
                <ConfirmButton confirmText="Tap again to delete"
                  onConfirm={() => { set.remove(rid, step.id); setExpandedId(null); }}>
                  Delete
                </ConfirmButton>
              </>
            )}
          />
          <form className="add-step" onSubmit={addStep}>
            <button type="button" className="emoji-button" aria-label={`Symbol for the new step: ${newEmoji}. Change`}
              onClick={() => setPicking({ kind: 'new' })}>
              {newEmoji}
            </button>
            <input id="new-step-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              placeholder={`New step for ${listName}`} aria-label="New step title" />
            <button type="submit" className="btn btn--primary" disabled={!newTitle.trim()}>Add</button>
          </form>
          {picking && (
            <EmojiPicker
              value={picking.kind === 'step' ? steps.find((s) => s.id === picking.id)?.image?.replace(/^emoji:/, '') ?? '' : newEmoji}
              onPick={pick} onClose={() => setPicking(null)} />
          )}
        </>
      )}
    </>
  );
}
