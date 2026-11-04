import { format } from 'date-fns';
import { useCallback, useState, type FormEvent } from 'react';
import { ChildStep } from '../components/ChildStep';
import { EditList } from '../components/EditList';
import { HoldButton } from '../components/HoldButton';
import { useIdleExit } from '../components/useIdleExit';
import type { Person, Routine } from '../data/types';
import { useCompletion } from '../data/useCompletion';
import { useRoutine } from '../data/useRoutine';
import { useDayKey } from '../date/useDayKey';

export function RoutineScreen({ person, seed }: { person: Person; seed: Routine }) {
  const [editing, setEditing] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const day = useDayKey();
  const routine = useRoutine(seed);
  const { done, setStep } = useCompletion(day, person.id);
  const exitEdit = useCallback(() => setEditing(false), []);
  useIdleExit(editing, exitEdit);

  const addStep = (e: FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    routine.add(title);
    setNewTitle('');
  };

  return (
    <main className={`screen ${editing ? 'screen--edit' : 'screen--child'}`}
      style={{ '--accent': person.colour } as React.CSSProperties}>
      <header className="screen-header">
        <div>
          <h1>{person.name}’s morning</h1>
          <p className="date">{format(new Date(`${day}T12:00:00`), 'EEEE d MMMM')}</p>
        </div>
        {editing ? (
          <div className="toolbar">
            <button type="button" className="btn" onClick={routine.undo} disabled={!routine.canUndo}>
              Undo
            </button>
            <button type="button" className="btn btn--primary" onClick={exitEdit}>
              Done
            </button>
          </div>
        ) : (
          <HoldButton label="Parent edit mode" onHold={() => setEditing(true)}>Parent</HoldButton>
        )}
      </header>

      {editing && routine.saveFailing && (
        <p className="notice" role="status">
          Not saved yet. Your changes are kept here and will save when possible.
          <button type="button" className="btn btn--small" onClick={routine.retrySave}>Retry now</button>
        </p>
      )}

      {editing ? (
        <>
          <p className="hint">Hold a step to drag it, or use the arrows.</p>
          <EditList
            steps={routine.steps}
            onDragMove={routine.dragMove}
            onUp={routine.moveUp}
            onDown={routine.moveDown}
            onDelete={routine.remove}
          />
          <form className="add-step" onSubmit={addStep}>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="New step"
              aria-label="New step title"
            />
            <button type="submit" className="btn btn--primary" disabled={!newTitle.trim()}>Add</button>
          </form>
        </>
      ) : (
        <ol className="steps">
          {routine.steps.map((step) => (
            <ChildStep key={step.id} step={step} done={done.has(step.id)}
              onSetDone={(d) => setStep(step.id, d)} />
          ))}
        </ol>
      )}
    </main>
  );
}
