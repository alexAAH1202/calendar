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
import { RoutinesBoard } from './RoutinesBoard';
import { WhoPicker } from '../components/WhoPicker';
import { SetupScreen } from './SetupScreen';
import { ColesButton } from '../wall/ColesButton';
import { DayModeContext } from '../now/DayModeContext';
import { ModeBanner, ModeSwitch } from '../now/ModeSwitch';
import { UpNextBar } from '../now/UpNextBar';
import { DinnerTonight } from '../meals/DinnerTonight';
import { MealsView } from '../meals/MealsView';
import { useDayMode } from '../now/useDayMode';
import { inSleepWindow } from '../wall/schedule';
import { SleepScreen } from '../wall/SleepScreen';
import { reloadApp } from '../wall/pwa';
import { useLastInput } from '../wall/useLastInput';
import { useNightlyReload } from '../wall/useNightlyReload';
import { useUpdateReady } from '../wall/useUpdateReady';
import { useWakeLock } from '../wall/useWakeLock';
import { useWallSettings } from '../wall/useWallSettings';

type View = 'agenda' | 'today' | 'routines' | 'chores' | 'braindump' | 'meals' | 'week' | 'month';

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
  // Phones open on the family's Day list; the wall on Today. A home-screen shortcut can open another tab
  // (?view=braindump&capture=1 opens the brain dump ready to type).
  const home: View = isPhone ? 'agenda' : 'today';
  const [view, setView] = useState<View>(() => startView() ?? home);
  const dayMode = useDayMode(store, day);
  const [panelDay, setPanelDay] = useState<Date | null>(null);
  const calendar = useCalendarData();
  const exitSetup = useCallback(() => setSetup(false), []);
  const backHome = useCallback(() => setView(home), [home]);
  const clearPanelDay = useCallback(() => setPanelDay(null), []);
  // A child can show just their own list; back to everyone's after five quiet minutes.
  const [who, setWho] = useState('all');
  const showAll = useCallback(() => setWho('all'), []);
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
  // Opened from the "Add to brain dump" shortcut: the input is focused, once.
  const [capturing] = useState(() => new URLSearchParams(window.location.search).has('capture'));
  // Setup closes after two quiet minutes on the wall.
  useIdleExit(setup && !isPhone, exitSetup);
  // The wall drifts back to Today after five quiet minutes on any other tab, editing included.
  useIdleExit(!setup && view !== home, backHome, 5 * 60_000);
  useIdleExit(!setup && panelDay !== null, clearPanelDay, 5 * 60_000);
  useIdleExit(!setup && who !== 'all', showAll, 5 * 60_000);

  const dateLine = <h1>{format(now, 'EEEE d MMMM')}</h1>;

  if (!loaded || !calendar.known) return <main className="screen screen--child"><p className="hint">Loading…</p></main>;

  if (sleepTime && !awake) return <SleepScreen now={now} onWake={() => setAwake(true)} />;

  if (setup) {
    return (
      <SetupScreen people={children} familyPanel={parentTools} onExit={exitSetup} header={dateLine} currentTod={tod}
        wakeLockHeld={isPhone ? undefined : wakeLockHeld} />
    );
  }

  const childView = view === 'today' || view === 'agenda' || view === 'routines';
  const shownKids = who === 'all' ? children : children.filter((c) => c.id === who);
  const whoPicker = <WhoPicker children={children} value={children.some((c) => c.id === who) ? who : 'all'} onChange={setWho} />;
  return (
    <DayModeContext.Provider value={dayMode.mode}>
    <main className={`screen ${childView ? 'screen--child' : ''} screen--wide ${view === 'today' || (view === 'routines' && !isPhone) ? 'screen--fit' : ''}`}>
      <header className="screen-header">
        {dateLine}
        <Tabs<View> label="View" value={view} onChange={setView} withIcons
          options={[
            isPhone ? { value: 'agenda', label: 'Day', icon: '📋' } : { value: 'today', label: 'Today', icon: '☀️' },
            { value: 'routines', label: 'Routines', icon: '✅' },
            { value: 'chores', label: 'Chores', icon: '🧹' },
            { value: 'braindump', label: 'Brain dump', icon: '💭' },
            { value: 'meals', label: 'Meals', icon: '🍽' },
            { value: 'week', label: 'Week', icon: '🗓️' },
            { value: 'month', label: 'Month', icon: '📅' },
          ]} />
        <div className="header-controls">
          <ModeSwitch mode={dayMode.mode} onChange={dayMode.set} />
          {isPhone && updateReady && (
            <button type="button" className="pill pill--round" title="Update ready: tap to load" aria-label="Update ready: tap to load"
              onClick={() => void reloadApp()}>⬆️</button>
          )}
          {isPhone ? (
            <button type="button" className="pill pill--round" title="Parent: set up the app" aria-label="Parent: set up the app" onClick={() => setSetup(true)}>⚙️</button>
          ) : (
            <HoldButton label="Parent: set up the app" onHold={() => setSetup(true)}>⚙️</HoldButton>
          )}
        </div>
      </header>
      <ModeBanner mode={dayMode.mode} />

      {view === 'agenda' ? (
        <DayAgenda children={children} now={now} />
      ) : view === 'routines' ? (
        <RoutinesBoard children={shownKids} day={day} now={now} currentTod={tod} who={whoPicker} />
      ) : view === 'chores' ? (
        <ChoresView children={children} day={day} />
      ) : view === 'braindump' ? (
        <section className="edit-surface" aria-label="Brain dump">
          <div className="editor-row editor-row--end">
            <ColesButton />
          </div>
          <BrainDump capture={capturing} />
        </section>
      ) : view === 'meals' ? (
        <MealsView now={now} />
      ) : view === 'week' || view === 'month' ? (
        <CalendarView key={view} now={now} mode={view} />
      ) : calendar.configured ? (
        <>
          <div className="today-strip">
            <UpNextBar now={now} />
            <DinnerTonight now={now} />
          </div>
          {children.length > 1 && <div className="editor-row who-row">{whoPicker}</div>}
          <div className="today-layout">
            <TodayPanel now={now} selected={panelDay ?? now} onSelect={setPanelDay} />
            <ChildBoard children={shownKids} day={day} tod={tod} now={now} />
          </div>
        </>
      ) : (
        <>
          <DinnerTonight now={now} />
          {children.length > 1 && <div className="editor-row who-row">{whoPicker}</div>}
          <ChildBoard children={shownKids} day={day} tod={tod} now={now} />
        </>
      )}
    </main>
    </DayModeContext.Provider>
  );
}

const VIEWS: View[] = ['agenda', 'today', 'routines', 'chores', 'braindump', 'meals', 'week', 'month'];

/** The tab asked for by a home-screen shortcut (?view=…), if any. */
function startView(): View | undefined {
  const v = new URLSearchParams(window.location.search).get('view');
  return VIEWS.includes(v as View) ? (v as View) : undefined;
}
