import { format } from 'date-fns';
import { useCallback, useState, type ReactNode } from 'react';
import { useCalendarData } from '../calendar/CalendarContext';
import { CalendarView } from '../calendar/CalendarView';
import { TodayPanel } from '../calendar/TodayPanel';
import { ChildBoard } from '../components/ChildBoard';
import { HoldButton } from '../components/HoldButton';
import { Tabs } from '../components/Tabs';
import { useIdleExit } from '../components/useIdleExit';
import { useStore } from '../data/StoreContext';
import { timeOfDayAt } from '../data/timeOfDay';
import { usePeople } from '../data/usePeople';
import { dayKey } from '../date/dayKey';
import { useNow } from '../date/useNow';
import { BrainDump } from '../lists/BrainDump';
import { ChoresView } from '../lists/ChoresView';
import { DayAgenda } from './DayAgenda';
import { RoutinesView } from './RoutinesView';
import { SetupScreen } from './SetupScreen';
import { ColesButton } from '../wall/ColesButton';
import { inSleepWindow } from '../wall/schedule';
import { SleepScreen } from '../wall/SleepScreen';
import { reloadApp } from '../wall/pwa';
import { useLastInput } from '../wall/useLastInput';
import { useNightlyReload } from '../wall/useNightlyReload';
import { useUpdateReady } from '../wall/useUpdateReady';
import { useWakeLock } from '../wall/useWakeLock';
import { useWallSettings } from '../wall/useWallSettings';

type View = 'agenda' | 'today' | 'routines' | 'chores' | 'braindump' | 'week' | 'month';

interface Props {
  /** A parent's phone: opens on the Day list, Setup behind a plain button. */
  isPhone?: boolean;
  /** The family panel (invite, sign out), shown in Setup. */
  parentTools?: ReactNode;
}

/**
 * The main screen. Everything used day to day is here: today's routines and events,
 * routines, chores, the brain dump and the calendar, with adding and changing in place.
 * Parent (hold on the wall, ⚙️ on a phone) is only for setting the app up.
 */
export function WallScreen({ isPhone = false, parentTools }: Props) {
  const store = useStore();
  const now = useNow();
  const day = dayKey(now);
  const tod = timeOfDayAt(now);
  const { children, loaded } = usePeople(store);
  const [setup, setSetup] = useState(false);
  // Phones open on the family's Day list; the wall on Today.
  const home: View = isPhone ? 'agenda' : 'today';
  const [view, setView] = useState<View>(home);
  const [panelDay, setPanelDay] = useState<Date | null>(null);
  const calendar = useCalendarData();
  const exitSetup = useCallback(() => setSetup(false), []);
  const backHome = useCallback(() => setView(home), [home]);
  const clearPanelDay = useCallback(() => setPanelDay(null), []);
  // The wall tablet only: keep the screen on, sleep on a schedule, reload once a night.
  const wall = useWallSettings(store).settings;
  const lastInput = useLastInput();
  const wakeLockHeld = useWakeLock(!isPhone);
  useNightlyReload(store, !isPhone && wall.nightlyReload, lastInput);
  const [awake, setAwake] = useState(false);
  const sleepAgain = useCallback(() => setAwake(false), []);
  const sleepTime = !isPhone && wall.sleepOn && inSleepWindow(now, wall.sleepFrom, wall.sleepTo);
  // Woken during sleep time: sleeps again after two quiet minutes.
  useIdleExit(sleepTime && awake, sleepAgain);
  const updateReady = useUpdateReady();
  // Setup closes after two quiet minutes on the wall.
  useIdleExit(setup && !isPhone, exitSetup);
  // The wall drifts back to Today after five quiet minutes on any other tab, editing included.
  useIdleExit(!setup && view !== home, backHome, 5 * 60_000);
  useIdleExit(!setup && panelDay !== null, clearPanelDay, 5 * 60_000);

  const dateLine = <h1>{format(now, 'EEEE d MMMM')}</h1>;

  if (!loaded || !calendar.known) return <main className="screen screen--child"><p className="hint">Loading…</p></main>;

  if (sleepTime && !awake) return <SleepScreen now={now} onWake={() => setAwake(true)} />;

  if (setup) {
    return (
      <SetupScreen people={children} familyPanel={parentTools} onExit={exitSetup} header={dateLine}
        wakeLockHeld={isPhone ? undefined : wakeLockHeld} />
    );
  }

  const childView = view === 'today' || view === 'agenda';
  return (
    <main className={`screen ${childView ? 'screen--child' : ''} screen--wide`}>
      <header className="screen-header">
        {dateLine}
        <Tabs<View> label="View" value={view} onChange={setView} withIcons
          options={[
            isPhone ? { value: 'agenda', label: 'Day', icon: '📋' } : { value: 'today', label: 'Today', icon: '☀️' },
            { value: 'routines', label: 'Routines', icon: '✅' },
            { value: 'chores', label: 'Chores', icon: '🧹' },
            { value: 'braindump', label: 'Brain dump', icon: '💭' },
            { value: 'week', label: 'Week', icon: '🗓️' },
            { value: 'month', label: 'Month', icon: '📅' },
          ]} />
        {isPhone && updateReady && (
          <button type="button" className="pill" onClick={() => void reloadApp()}>Update ready</button>
        )}
        {isPhone ? (
          <button type="button" className="pill pill--round" aria-label="Parent: set up the app" onClick={() => setSetup(true)}>⚙️</button>
        ) : (
          <HoldButton label="Parent: set up the app" onHold={() => setSetup(true)}>Parent</HoldButton>
        )}
      </header>

      {view === 'agenda' ? (
        <DayAgenda children={children} now={now} />
      ) : view === 'routines' ? (
        <RoutinesView children={children} currentTod={tod} />
      ) : view === 'chores' ? (
        <ChoresView children={children} day={day} />
      ) : view === 'braindump' ? (
        <section className="edit-surface" aria-label="Brain dump">
          <div className="editor-row editor-row--end">
            <ColesButton />
          </div>
          <BrainDump />
        </section>
      ) : view === 'week' || view === 'month' ? (
        <CalendarView key={view} now={now} mode={view} />
      ) : calendar.configured ? (
        <div className="today-layout">
          <TodayPanel now={now} selected={panelDay ?? now} onSelect={setPanelDay} />
          <ChildBoard children={children} day={day} tod={tod} />
        </div>
      ) : (
        <ChildBoard children={children} day={day} tod={tod} />
      )}
    </main>
  );
}
