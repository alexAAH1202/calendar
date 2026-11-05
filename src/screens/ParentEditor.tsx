import { useState, type FormEvent, type ReactNode } from 'react';
import { seedFor } from '../components/ChildColumn';
import { ChildSettings } from '../components/ChildSettings';
import { ConfirmButton } from '../components/ConfirmButton';
import { EditList } from '../components/EditList';
import { DEFAULT_EMOJI } from '../components/emoji';
import { EmojiPicker } from '../components/EmojiPicker';
import { StepImage } from '../components/StepImage';
import { SyncNotices } from '../components/SyncNotices';
import { Tabs } from '../components/Tabs';
import { TemplatesPanel } from '../components/TemplatesPanel';
import { newId } from '../data/ids';
import { PERSON_COLOURS } from '../data/profile';
import { useStore } from '../data/StoreContext';
import { TIME_LABELS, routineId } from '../data/timeOfDay';
import { TIMES_OF_DAY, type Person, type TimeOfDay } from '../data/types';
import { useRoutineSet } from '../data/useRoutineSet';
import { useTemplates } from '../data/useTemplates';

type Panel = 'none' | 'settings' | 'templates' | 'family';

interface Props {
  people: Person[];
  currentTod: TimeOfDay;
  isPhone: boolean;
  parentTools?: ReactNode;
  onExit: () => void;
  header: ReactNode;
}

/** Parent mode: choose a child and a time of day, then edit that list. */
export function ParentEditor({ people, currentTod, isPhone, parentTools, onExit, header }: Props) {
  const store = useStore();
  const [childId, setChildId] = useState<string | undefined>(people[0]?.id);
  const [panel, setPanel] = useState<Panel>('none');
  const child = people.find((p) => p.id === childId) ?? people[0];

  const addChild = () => {
    const used = new Set(people.map((p) => p.colour));
    const person: Person = {
      id: newId('p'),
      name: 'New child',
      role: 'child',
      colour: PERSON_COLOURS.find((c) => !used.has(c)) ?? PERSON_COLOURS[0],
      order: Math.max(0, ...people.map((p) => p.order ?? 0)) + 1,
      sensory: {},
    };
    void store.savePerson(person);
    setChildId(person.id);
    setPanel('settings');
  };

  const toggle = (p: Panel) => setPanel((cur) => (cur === p ? 'none' : p));

  return (
    <main className="screen screen--edit">
      <header className="screen-header">
        {header}
        <div className="toolbar">
          {parentTools && (
            <button type="button" className="btn" aria-expanded={panel === 'family'} onClick={() => toggle('family')}>
              Family
            </button>
          )}
          <button type="button" className="btn btn--primary" onClick={onExit}>{isPhone ? 'Preview' : 'Done'}</button>
        </div>
      </header>
      {panel === 'family' && parentTools}

      <div className="editor-row">
        <Tabs label="Child" value={child?.id ?? ''} onChange={(id) => setChildId(id)}
          options={people.map((p) => ({
            value: p.id,
            label: <>{p.avatar && <StepImage image={p.avatar} />} {p.name}</>,
          }))} />
        <button type="button" className="btn" onClick={addChild}>+ Add child</button>
      </div>

      {child ? (
        <ChildEditor key={child.id} child={child} currentTod={currentTod} panel={panel} onTogglePanel={toggle}
          canDelete={people.length > 1}
          onDeleted={() => {
            setChildId(people.find((p) => p.id !== child.id)?.id);
            setPanel('none');
          }} />
      ) : (
        <p className="hint">Add a child to start.</p>
      )}
    </main>
  );
}

type Picking = { kind: 'new' } | { kind: 'step'; id: string } | null;

function ChildEditor({ child, currentTod, panel, onTogglePanel, canDelete, onDeleted }: {
  child: Person;
  currentTod: TimeOfDay;
  panel: Panel;
  onTogglePanel: (p: Panel) => void;
  canDelete: boolean;
  onDeleted: () => void;
}) {
  const store = useStore();
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
          <button type="button" className="btn" aria-expanded={panel === 'templates'} onClick={() => onTogglePanel('templates')}>
            Templates
          </button>
          <button type="button" className="btn" aria-expanded={panel === 'settings'} onClick={() => onTogglePanel('settings')}>
            {child.name}’s settings
          </button>
        </div>
      </div>

      {panel === 'settings' && (
        <ChildSettings person={child} canDelete={canDelete} onSave={(p) => void store.savePerson(p)}
          onDelete={() => {
            void store.deletePerson(child.id, TIMES_OF_DAY.map((t) => routineId(child.id, t)));
            onDeleted();
          }} />
      )}
      {panel === 'templates' && (
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
