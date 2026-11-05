import { format } from 'date-fns';
import { useCallback, useState, type ReactNode } from 'react';
import { ChildBoard } from '../components/ChildBoard';
import { HoldButton } from '../components/HoldButton';
import { useIdleExit } from '../components/useIdleExit';
import { useStore } from '../data/StoreContext';
import { timeOfDayAt } from '../data/timeOfDay';
import { usePeople } from '../data/usePeople';
import { dayKey } from '../date/dayKey';
import { useNow } from '../date/useNow';
import { ParentEditor } from './ParentEditor';

interface Props {
  /** Phones open straight into edit mode and do not time out of it. */
  isPhone?: boolean;
  /** Extra parent-only controls, such as the family panel. */
  parentTools?: ReactNode;
}

/** The wall tablet's screen: every child's current routine, and parent mode behind a hold. */
export function WallScreen({ isPhone = false, parentTools }: Props) {
  const store = useStore();
  const now = useNow();
  const day = dayKey(now);
  const tod = timeOfDayAt(now);
  const { children, loaded } = usePeople(store);
  const [editing, setEditing] = useState(isPhone);
  const exitEdit = useCallback(() => setEditing(false), []);
  useIdleExit(editing && !isPhone, exitEdit);

  const dateLine = (
    <div>
      <h1>{format(now, 'EEEE d MMMM')}</h1>
    </div>
  );

  if (!loaded) return <main className="screen screen--child"><p className="hint">Loading…</p></main>;

  if (editing) {
    return (
      <ParentEditor people={children} currentTod={tod} isPhone={isPhone} parentTools={parentTools}
        onExit={exitEdit} header={dateLine} />
    );
  }

  return (
    <main className={`screen screen--child ${children.length > 1 ? 'screen--wide' : ''}`}>
      <header className="screen-header">
        {dateLine}
        {isPhone ? (
          <button type="button" className="btn" onClick={() => setEditing(true)}>Edit</button>
        ) : (
          <HoldButton label="Parent edit mode" onHold={() => setEditing(true)}>Parent</HoldButton>
        )}
      </header>
      <ChildBoard children={children} day={day} tod={tod} />
    </main>
  );
}
