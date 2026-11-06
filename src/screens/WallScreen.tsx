import { format } from 'date-fns';
import { useCallback, useState, type ReactNode } from 'react';
import { useCalendarData } from '../calendar/CalendarContext';
import { MonthView } from '../calendar/MonthView';
import { TodayPanel } from '../calendar/TodayPanel';
import { WeekView } from '../calendar/WeekView';
import { ChildBoard } from '../components/ChildBoard';
import { ChoreBoard } from '../lists/ChoreBoard';
import { DayAgenda } from './DayAgenda';
import { Tabs } from '../components/Tabs';
import { HoldButton } from '../components/HoldButton';
import { useIdleExit } from '../components/useIdleExit';
import { useStore } from '../data/StoreContext';
import { timeOfDayAt } from '../data/timeOfDay';
import { usePeople } from '../data/usePeople';
import { dayKey } from '../date/dayKey';
import { useNow } from '../date/useNow';
import { ParentEditor } from './ParentEditor';

type WallView = 'agenda' | 'today' | 'chores' | 'week' | 'month';

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
  const [editing, setEditing] = useState(false);
  // Phones open on the family's Day list; the wall on Today.
  const home: WallView = isPhone ? 'agenda' : 'today';
  const [view, setView] = useState<WallView>(home);
  const [panelDay, setPanelDay] = useState<Date | null>(null);
  const clearPanelDay = useCallback(() => setPanelDay(null), []);
  const calendar = useCalendarData();
  const calendarReady = calendar.configured;
  const exitEdit = useCallback(() => setEditing(false), []);
  const backToToday = useCallback(() => setView(home), [home]);
  useIdleExit(editing && !isPhone, exitEdit);
  // The wall drifts back to Today after five quiet minutes on another view.
  useIdleExit(!editing && view !== home, backToToday, 5 * 60_000);
  // A day picked in the Today panel's week strip also goes back to today after five quiet minutes.
  useIdleExit(!editing && panelDay !== null, clearPanelDay, 5 * 60_000);

  const dateLine = (
    <div>
      <h1>{format(now, 'EEEE d MMMM')}</h1>
    </div>
  );

  if (!loaded || !calendar.known) return <main className="screen screen--child"><p className="hint">Loading…</p></main>;

  if (editing) {
    return (
      <ParentEditor people={children} currentTod={tod} parentTools={parentTools}
        onExit={exitEdit} header={dateLine} now={now} />
    );
  }

  const wide = calendarReady || children.length > 1 || view === 'chores';
  return (
    <main className={`screen screen--child ${wide ? 'screen--wide' : ''}`}>
      <header className="screen-header">
        {dateLine}
        <Tabs<WallView> label="View" value={view} onChange={setView} withIcons
          options={[
            ...(isPhone ? [{ value: 'agenda' as const, label: 'Day', icon: '📋' }] : []),
            { value: 'today', label: isPhone ? 'Routines' : 'Today', icon: '☀️' },
            { value: 'chores', label: 'Chores', icon: '🧹' },
            ...(calendarReady
              ? [{ value: 'week' as const, label: 'Week', icon: '🗓️' }, { value: 'month' as const, label: 'Month', icon: '📅' }]
              : []),
          ]} />
        {!isPhone && <HoldButton label="Parent edit mode" onHold={() => setEditing(true)}>Parent</HoldButton>}
      </header>
      {view === 'agenda' ? (
        <DayAgenda children={children} now={now} />
      ) : view === 'chores' ? (
        <ChoreBoard children={children} day={day} />
      ) : view === 'week' && calendarReady ? (
        <WeekView now={now} anchor={now} />
      ) : view === 'month' && calendarReady ? (
        <MonthView now={now} anchor={now} />
      ) : calendarReady ? (
        <div className="today-layout">
          <TodayPanel now={now} selected={panelDay ?? now} onSelect={setPanelDay} />
          <ChildBoard children={children} day={day} tod={tod} />
        </div>
      ) : (
        <ChildBoard children={children} day={day} tod={tod} />
      )}
      {isPhone && (
        <button type="button" className="fab" aria-label="Edit: add and change routines, chores and events" onClick={() => setEditing(true)}>
          +
        </button>
      )}
    </main>
  );
}
