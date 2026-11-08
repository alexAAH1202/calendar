import { ChildBoard } from '../components/ChildBoard';
import { Tabs } from '../components/Tabs';
import { TIME_LABELS } from '../data/timeOfDay';
import { TIMES_OF_DAY, type Person, type TimeOfDay } from '../data/types';
import { useState } from 'react';

/**
 * The Routines tab: every child's list for a time of day, to look at and tick (no editing;
 * that is in Parent → Routines). Opens on the current time of day.
 */
export function RoutinesBoard({ children, day, now, currentTod, who }: { children: Person[]; day: string; now: Date; currentTod: TimeOfDay; who?: React.ReactNode }) {
  const [tod, setTod] = useState<TimeOfDay>(currentTod);
  return (
    <>
      <div className="editor-row routines-times">
        <Tabs<TimeOfDay> label="Time of day" value={tod} onChange={setTod}
          options={TIMES_OF_DAY.map((t) => ({ value: t, label: `${t === 'morning' ? '🌅' : t === 'afternoon' ? '🌤️' : '🌙'} ${TIME_LABELS[t]}` }))} />
        {who}
      </div>
      <ChildBoard children={children} day={day} tod={tod} now={now} />
    </>
  );
}
