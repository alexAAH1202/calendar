import { format } from 'date-fns';
import { useCallback, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { ChildStep } from '../components/ChildStep';
import { EditList } from '../components/EditList';
import { DEFAULT_EMOJI } from '../components/emoji';
import { EmojiPicker } from '../components/EmojiPicker';
import { HoldButton } from '../components/HoldButton';
import { SyncNotices } from '../components/SyncNotices';
import { useIdleExit } from '../components/useIdleExit';
import { useStore } from '../data/StoreContext';
import type { Person, Routine } from '../data/types';
import { useCompletion } from '../data/useCompletion';
import { useRoutine } from '../data/useRoutine';
import { useDayKey } from '../date/useDayKey';

interface Props {
  person: Person;
  seed: Routine;
  /** Phones open straight into edit mode and do not time out of it. */
  isPhone?: boolean;
  /** Extra parent-only controls, such as the family panel. */
  parentTools?: ReactNode;
}

type Picking = { kind: 'new' } | { kind: 'step'; id: string } | null;

export function RoutineScreen({ person, seed, isPhone = false, parentTools }: Props) {
  const store = useStore();
  const [editing, setEditing] = useState(isPhone);
  const [newTitle, setNewTitle] = useState('');
  const [newEmoji, setNewEmoji] = useState(DEFAULT_EMOJI);
  const [picking, setPicking] = useState<Picking>(null);
  const [showTools, setShowTools] = useState(false);
  const day = useDayKey();
  const routine = useRoutine(store, seed);
  const { done, setStep, loaded: daysLoaded } = useCompletion(store, day, person.id);
  // Show nothing until the saved order and ticks are known, so the child never sees the list jump.
  const ready = routine.loaded && daysLoaded;
  const exitEdit = useCallback(() => {
    setEditing(false);
    setPicking(null);
    setShowTools(false);
  }, []);
  useIdleExit(editing && !isPhone, exitEdit);

  const addStep = (e: FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    routine.add(title, newEmoji);
    setNewTitle('');
    setNewEmoji(DEFAULT_EMOJI);
  };

  const pick = (emoji: string) => {
    if (picking?.kind === 'new') setNewEmoji(emoji);
    if (picking?.kind === 'step') routine.setEmoji(picking.id, emoji);
    setPicking(null);
  };

  const pickingValue =
    picking?.kind === 'step'
      ? routine.steps.find((s) => s.id === picking.id)?.image?.replace(/^emoji:/, '') ?? ''
      : newEmoji;

  return (
    <main className={`screen ${editing ? 'screen--edit' : 'screen--child'}`}
      style={{ '--accent': person.colour } as CSSProperties}>
      <header className="screen-header">
        <div>
          <h1>{person.name}’s morning</h1>
          <p className="date">{format(new Date(`${day}T12:00:00`), 'EEEE d MMMM')}</p>
        </div>
        {editing ? (
          <div className="toolbar">
            <button type="button" className="btn" onClick={routine.undo} disabled={!routine.canUndo}>Undo</button>
            {parentTools && (
              <button type="button" className="btn" aria-expanded={showTools} onClick={() => setShowTools((s) => !s)}>
                Family
              </button>
            )}
            <button type="button" className="btn btn--primary" onClick={exitEdit}>
              {isPhone ? 'Preview' : 'Done'}
            </button>
          </div>
        ) : isPhone ? (
          <button type="button" className="btn" onClick={() => setEditing(true)}>Edit</button>
        ) : (
          <HoldButton label="Parent edit mode" onHold={() => setEditing(true)}>Parent</HoldButton>
        )}
      </header>

      {editing && showTools && parentTools}
      {editing && <SyncNotices routine={routine} />}

      {editing ? (
        <>
          <p className="hint">Hold a step to drag it, or use the arrows. Tap a symbol to change it.</p>
          <EditList
            steps={routine.steps}
            onDragMove={routine.dragMove}
            onUp={routine.moveUp}
            onDown={routine.moveDown}
            onDelete={routine.remove}
            onPickEmoji={(id) => setPicking({ kind: 'step', id })}
          />
          <form className="add-step" onSubmit={addStep}>
            <button type="button" className="emoji-button" aria-label={`Symbol for the new step: ${newEmoji}. Change`}
              onClick={() => setPicking({ kind: 'new' })}>
              {newEmoji}
            </button>
            <input
              id="new-step-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New step"
              aria-label="New step title"
            />
            <button type="submit" className="btn btn--primary" disabled={!newTitle.trim()}>Add</button>
          </form>
          {picking && <EmojiPicker value={pickingValue} onPick={pick} onClose={() => setPicking(null)} />}
        </>
      ) : !ready ? (
        <p className="hint" aria-live="polite">Loading…</p>
      ) : (
        <ol className="steps">
          {routine.steps.map((step) => (
            <ChildStep key={step.id} step={step} done={done.has(step.id)} onSetDone={(d) => setStep(step.id, d)} />
          ))}
        </ol>
      )}
    </main>
  );
}
