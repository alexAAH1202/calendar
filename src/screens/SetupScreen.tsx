import { useState, type ReactNode } from 'react';
import { CalendarSetup } from '../calendar/CalendarSetup';
import { ChildSettings } from '../components/ChildSettings';
import { StepImage } from '../components/StepImage';
import { Tabs } from '../components/Tabs';
import { newId } from '../data/ids';
import { PERSON_COLOURS } from '../data/profile';
import { useStore } from '../data/StoreContext';
import { routineId } from '../data/timeOfDay';
import { TIMES_OF_DAY, type Person, type TimeOfDay } from '../data/types';
import { WallSetup } from '../wall/WallSetup';
import { RoutinesView } from './RoutinesView';
import { AdultSettings } from '../components/AdultSettings';
import { TravelSetup } from '../now/TravelSetup';

type Section = 'children' | 'routines' | 'calendar' | 'wall' | 'family';

interface Props {
  people: Person[];
  /** Adults with a row on the calendar timeline (no account needed). */
  adults: Person[];
  /** The family panel (invite, sign out); missing when running on one device only. */
  familyPanel?: ReactNode;
  onExit: () => void;
  header: ReactNode;
  /** The wall tablet's screen lock state; undefined on phones. */
  wakeLockHeld?: boolean;
  currentTod: TimeOfDay;
}

/** Parent: setting up the app. Children and their settings, the calendar connection, the family. */
export function SetupScreen({ people, adults, familyPanel, onExit, header, wakeLockHeld, currentTod }: Props) {
  const store = useStore();
  const [section, setSection] = useState<Section>('children');
  const [childId, setChildId] = useState<string | undefined>(people[0]?.id);
  const [pendingId, setPendingId] = useState<string>();
  const found = people.find((p) => p.id === childId);
  // A just-added child appears once saved; until then never fall back to (and edit) another child.
  const waitingForNew = !found && childId !== undefined && childId === pendingId;
  const child = found ?? (waitingForNew ? undefined : people[0]);

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
    setPendingId(person.id);
    setChildId(person.id);
  };

  return (
    <main className="screen screen--edit">
      <header className="screen-header">
        {header}
        <button type="button" className="btn btn--primary" onClick={onExit}>Done</button>
      </header>
      <div className="editor-row">
        <Tabs<Section> label="Setup" value={section} onChange={setSection} withIcons
          options={[
            { value: 'children', label: 'People', icon: '🧒' },
            { value: 'routines', label: 'Routines', icon: '✅' },
            { value: 'calendar', label: 'Calendar', icon: '🔗' },
            { value: 'wall', label: 'Wall', icon: '🖥️' },
            ...(familyPanel ? [{ value: 'family' as const, label: 'Family', icon: '👪' }] : []),
          ]} />
      </div>

      {section === 'routines' ? (
        <RoutinesView children={people} currentTod={currentTod} />
      ) : section === 'calendar' ? (
        <>
          <CalendarSetup />
          <TravelSetup />
        </>
      ) : section === 'wall' ? (
        <WallSetup wakeLockHeld={wakeLockHeld} />
      ) : section === 'family' ? (
        familyPanel
      ) : (
        <>
          <div className="editor-row">
            <Tabs label="Child" value={child?.id ?? ''} onChange={setChildId}
              options={people.map((p) => ({ value: p.id, label: <>{p.avatar && <StepImage image={p.avatar} />} {p.name}</> }))} />
            <button type="button" className="btn" onClick={addChild}>+ Add child</button>
          </div>
          {waitingForNew ? (
            <p className="hint">Adding…</p>
          ) : child ? (
            <ChildSettings key={child.id} person={child} canDelete={people.length > 1}
              onChange={(c) => void store.updatePerson(child.id, c)}
              onDelete={() => {
                void store.deletePerson(child.id, TIMES_OF_DAY.map((t) => routineId(child.id, t)));
                setChildId(people.find((p) => p.id !== child.id)?.id);
              }} />
          ) : (
            <p className="hint">Add a child to start.</p>
          )}
          <AdultSettings adults={adults} everyone={[...people, ...adults]} />
        </>
      )}
    </main>
  );
}
