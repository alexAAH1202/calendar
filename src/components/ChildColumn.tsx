import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { cheerFor, progressText } from './celebrate';
import { Confetti } from './Confetti';
import { displaySteps } from '../data/display';
import { PALETTES, TEXT_SIZES, profileOf } from '../data/profile';
import { SEED_ROUTINE } from '../data/seed';
import { useStore } from '../data/StoreContext';
import { TIME_LABELS, routineId } from '../data/timeOfDay';
import type { Person, Routine, TimeOfDay } from '../data/types';
import { useCompletion } from '../data/useCompletion';
import { useRoutineSet } from '../data/useRoutineSet';
import { ChildStep } from './ChildStep';
import { playAllDoneCue, playSoftCue } from './softCue';
import { Avatar } from './Avatar';
import { FirstThen } from './FirstThen';
import { RewardBar } from './RewardBar';
import { useReward } from '../lists/useReward';
import { forMode } from '../now/dayMode';
import { useMode } from '../now/DayModeContext';
import { FinishBy } from '../now/FinishBy';

/** The routine a person has for a time of day before anything is saved. */
export function seedFor(personId: string, tod: TimeOfDay): Routine {
  const id = routineId(personId, tod);
  return id === SEED_ROUTINE.id ? SEED_ROUTINE : { id, personId, timeOfDay: tod, steps: [], updatedAt: 0 };
}

/** One child's current routine on the wall, drawn with that child's sensory profile. */
export function ChildColumn({ person, day, tod, now }: { person: Person; day: string; tod: TimeOfDay; now: Date }) {
  const store = useStore();
  const profile = profileOf(person);
  const seed = seedFor(person.id, tod);
  const set = useRoutineSet(store, [seed]);
  const { done, setStep, loaded: dayLoaded } = useCompletion(store, day, person.id);
  const { reward } = useReward(store, person.id);
  const palette = PALETTES[profile.palette];
  const mode = useMode();
  const routine = set.routines[seed.id];
  // On a low-energy or running-late day only the essential steps show, and those count as the whole list.
  const steps = forMode(routine?.steps ?? [], mode);
  const visible = displaySteps(steps, done, profile.completedBehaviour);
  const allDone = steps.length > 0 && steps.every((s) => done.has(s.id));

  const style = {
    '--accent': person.colour,
    '--bg': palette.bg,
    '--surface': palette.surface,
    '--text': palette.text,
    '--muted': palette.muted,
    '--tint': `${palette.tint * 100}%`,
    '--child-text': `${TEXT_SIZES[profile.textSize]}px`,
    filter: profile.brightness < 1 ? `brightness(${profile.brightness})` : undefined,
  } as CSSProperties;

  const doneCount = steps.filter((s) => done.has(s.id)).length;
  const [cheer, setCheer] = useState<{ key: number; text: string; stars: number; stepId: string } | null>(null);
  const [confetti, setConfetti] = useState(false);
  const cheers = useRef(0);
  const stopConfetti = useCallback(() => setConfetti(false), []);
  useEffect(() => {
    if (!cheer) return;
    const t = window.setTimeout(() => setCheer(null), 1800);
    return () => window.clearTimeout(t);
  }, [cheer]);

  const tick = (stepId: string, isDone: boolean) => {
    const stars = steps.find((s) => s.id === stepId)?.stars ?? 1;
    const finishes = isDone && !done.has(stepId) && doneCount + 1 === steps.length;
    if (isDone && profile.sound) (finishes ? playAllDoneCue : playSoftCue)();
    setStep(stepId, isDone, stars);
    if (!isDone || profile.celebration === 'off') return;
    // A small win on every tick; the whole list finished gets a bigger one.
    const n = cheers.current++;
    setCheer({ key: n, text: finishes ? `All done, ${person.name}!` : cheerFor(n), stars, stepId });
    if (finishes && profile.celebration === 'big') setConfetti(true);
  };

  return (
    <section className={`child-column celebrate-${profile.celebration} ${profile.animation === 'soft' ? 'motion-soft' : 'motion-none'} ${profile.palette === 'contrast' ? 'child-column--contrast' : ''}`} style={style}
      aria-label={`${person.name}’s ${TIME_LABELS[tod].toLowerCase()}`}>
      <header className="child-header">
        <Avatar name={person.name} colour={person.colour} image={person.avatar} size={56} />
        <h2>{person.name}</h2>
        <span className="child-tod">{TIME_LABELS[tod]}</span>
      </header>
      <RewardBar personId={person.id} />
      {steps.length > 0 && set.loaded && dayLoaded && (
        <div className="progress" aria-label={progressText(doneCount, steps.length)}>
          <span className="progress-text">{progressText(doneCount, steps.length)}</span>
          <span className="progress-bar" aria-hidden="true"><span style={{ width: `${(doneCount / steps.length) * 100}%` }} /></span>
        </div>
      )}
      {routine?.finishBy && set.loaded && dayLoaded && (
        <FinishBy finishBy={routine.finishBy} now={now} stepsLeft={steps.length - doneCount} />
      )}
      {cheer && (
        <div key={cheer.key} className="cheer" role="status">
          <span className="cheer-text">{cheer.text}</span>
          {cheer.stars > 0 && <span className="cheer-stars">+{cheer.stars} ⭐</span>}
        </div>
      )}
      {confetti && <Confetti colours={[person.colour, '#f2c94c', '#56ccf2', '#f2994a', '#bb6bd9']} onDone={stopConfetti} />}
      {!set.loaded || !dayLoaded ? (
        <p className="hint" aria-live="polite">Loading…</p>
      ) : steps.length === 0 ? (
        <p className="hint">Nothing to do this {TIME_LABELS[tod].toLowerCase()}.</p>
      ) : (
        <>
          {profile.layout === 'firstThen' ? (
            <FirstThen steps={steps} done={done} onSetDone={tick} symbolMode={profile.symbolMode} sound={profile.sound}
              rewardLabel={reward.label} />
          ) : (
            <ol className="steps">
              {visible.map((step) => (
                <ChildStep key={step.id} step={step} done={done.has(step.id)} symbolMode={profile.symbolMode}
                  timerSeconds={step.timerSeconds} sound={profile.sound} onSetDone={(d) => tick(step.id, d)}
                  justTicked={cheer?.stepId === step.id} />
              ))}
            </ol>
          )}
          {allDone && (
            <p className="all-done">
              {profile.celebration === 'off' ? <><span aria-hidden="true">✓</span> All done</> : <>🎉 All done, {person.name}!</>}
            </p>
          )}
        </>
      )}
    </section>
  );
}
