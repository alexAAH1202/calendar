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
import { TIMES_OF_DAY, type Person, type Step, type TimeOfDay } from '../data/types';
import { useRoutineSet, type RoutineSet } from '../data/useRoutineSet';
import { useTemplates } from '../data/useTemplates';

/** The Routines tab: pick a child and a time of day, then change that list. */
export function RoutinesView({ children, currentTod }: { children: Person[]; currentTod: TimeOfDay }) {
  // Every child's lists in one set, so duplicating to another child is one change with one undo.
  const set = useRoutineSet(useStore(), children.flatMap((c) => TIMES_OF_DAY.map((t) => seedFor(c.id, t))));
  const [childId, setChildId] = useState<string | undefined>(children[0]?.id);
  const child = children.find((p) => p.id === childId) ?? children[0];
  if (!child) return <p className="hint">Add a child in Parent → Children first.</p>;
  return (
    <section className="edit-surface" aria-label="Routines">
      <div className="editor-row">
        <Tabs label="Child" value={child.id} onChange={setChildId}
          options={children.map((p) => ({ value: p.id, label: <>{p.avatar && <StepImage image={p.avatar} />} {p.name}</> }))} />
      </div>
      <RoutineEditor key={child.id} child={child} siblings={children.filter((c) => c.id !== child.id)} set={set} currentTod={currentTod} />
    </section>
  );
}

type Picking = { kind: 'new' } | { kind: 'step'; id: string } | null;

function RoutineEditor({ child, siblings, set, currentTod }: {
  child: Person;
  siblings: Person[];
  set: RoutineSet;
  currentTod: TimeOfDay;
}) {
  const store = useStore();
  const [showTemplates, setShowTemplates] = useState(false);
  const templates = useTemplates(store);
  const [tod, setTod] = useState<TimeOfDay>(currentTod);
  const [copied, setCopied] = useState<string>();
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

      {set.loaded && (
        <div className="editor-row editor-row--start">
          <label className="inline-field">
            Finish by (optional)
            <input id="finish-by" type="time" value={set.routines[rid]?.finishBy ?? ''} onChange={(e) => set.setFinishBy(rid, e.target.value)} />
          </label>
          {set.routines[rid]?.finishBy && (
            <button type="button" className="pill" onClick={() => set.setFinishBy(rid, '')}>No finish time</button>
          )}
          <p className="panel-text">The wall counts down to it: “Finish by 8:20 · 12 min left”.</p>
        </div>
      )}
      {set.loaded && steps.length > 0 && siblings.length > 0 && (
        <DuplicateRow siblings={siblings} tod={tod} steps={steps} set={set} onDone={setCopied} />
      )}
      {copied && <p className="notice notice--info" role="status">{copied}</p>}

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
            metaFor={(st) => [st.essential ? '✱ essential' : '', st.stars ? '⭐'.repeat(st.stars) : 'no stars'].filter(Boolean).join(' · ')}
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
                {siblings.map((sib) => (
                  <button key={sib.id} type="button" className="btn"
                    onClick={() => {
                      set.applyTemplate(routineId(sib.id, tod), [step], 'append');
                      setCopied(`Copied “${step.title}” to the end of ${sib.name}’s ${TIME_LABELS[tod].toLowerCase()}.`);
                      setExpandedId(null);
                    }}>
                    Duplicate for {sib.name}
                  </button>
                ))}
                <label className="check">
                  <input type="checkbox" checked={!!step.essential} onChange={(e) => set.updateStep(rid, step.id, { essential: e.target.checked })} />
                  <span>Essential on low-energy days</span>
                </label>
                <label className="inline-field">
                  Stars
                  <select value={String(step.stars ?? 1)} onChange={(e) => set.updateStep(rid, step.id, { stars: Number(e.target.value) })}>
                    {[0, 1, 2, 3].map((v) => <option key={v} value={v}>{v ? '⭐'.repeat(v) : 'None'}</option>)}
                  </select>
                </label>
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

/**
 * "Duplicate for Ethan": copies this whole list to the other child's same time of day.
 * If theirs already has steps, asks whether to add after them or replace them.
 * The copies get new ids (ticks never carry over) and Undo reverses it.
 */
function DuplicateRow({ siblings, tod, steps, set, onDone }: {
  siblings: Person[];
  tod: TimeOfDay;
  steps: Step[];
  set: RoutineSet;
  onDone: (message: string) => void;
}) {
  const [asking, setAsking] = useState<Person | null>(null);
  const when = TIME_LABELS[tod].toLowerCase();
  const target = (p: Person) => set.routines[routineId(p.id, tod)]?.steps ?? [];
  const copy = (p: Person, mode: 'append' | 'replace') => {
    set.applyTemplate(routineId(p.id, tod), steps, mode);
    setAsking(null);
    onDone(
      `${mode === 'replace' ? 'Replaced' : 'Copied'} ${steps.length} ${steps.length === 1 ? 'step' : 'steps'} ${mode === 'replace' ? 'in' : 'to'} ${p.name}’s ${when}. Undo puts it back.`,
    );
  };
  return (
    <div className="duplicate-row">
      {asking ? (
        <>
          <span className="panel-text">{asking.name}’s {when} already has {target(asking).length} steps.</span>
          <button type="button" className="btn" onClick={() => copy(asking, 'append')}>Add after them</button>
          <button type="button" className="btn btn--danger" onClick={() => copy(asking, 'replace')}>Replace them</button>
          <button type="button" className="pill" onClick={() => setAsking(null)}>Cancel</button>
        </>
      ) : (
        siblings.map((p) => (
          <button key={p.id} type="button" className="btn"
            onClick={() => (target(p).length ? setAsking(p) : copy(p, 'append'))}>
            ⧉ Duplicate for {p.name}
          </button>
        ))
      )}
    </div>
  );
}
