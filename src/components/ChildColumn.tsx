import type { CSSProperties } from 'react';
import { displaySteps } from '../data/display';
import { PALETTES, TEXT_SIZES, profileOf } from '../data/profile';
import { SEED_ROUTINE } from '../data/seed';
import { useStore } from '../data/StoreContext';
import { TIME_LABELS, routineId } from '../data/timeOfDay';
import type { Person, Routine, TimeOfDay } from '../data/types';
import { useCompletion } from '../data/useCompletion';
import { useRoutineSet } from '../data/useRoutineSet';
import { ChildStep } from './ChildStep';
import { playSoftCue } from './softCue';
import { Avatar } from './Avatar';

/** The routine a person has for a time of day before anything is saved. */
export function seedFor(personId: string, tod: TimeOfDay): Routine {
  const id = routineId(personId, tod);
  return id === SEED_ROUTINE.id ? SEED_ROUTINE : { id, personId, timeOfDay: tod, steps: [], updatedAt: 0 };
}

/** One child's current routine on the wall, drawn with that child's sensory profile. */
export function ChildColumn({ person, day, tod }: { person: Person; day: string; tod: TimeOfDay }) {
  const store = useStore();
  const profile = profileOf(person);
  const seed = seedFor(person.id, tod);
  const set = useRoutineSet(store, [seed]);
  const { done, setStep, loaded: dayLoaded } = useCompletion(store, day, person.id);
  const palette = PALETTES[profile.palette];
  const steps = set.routines[seed.id]?.steps ?? [];
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

  const tick = (stepId: string, isDone: boolean) => {
    if (isDone && profile.sound) playSoftCue();
    setStep(stepId, isDone);
  };

  return (
    <section className={`child-column ${profile.animation === 'soft' ? 'motion-soft' : 'motion-none'} ${profile.palette === 'contrast' ? 'child-column--contrast' : ''}`} style={style}
      aria-label={`${person.name}’s ${TIME_LABELS[tod].toLowerCase()}`}>
      <header className="child-header">
        <Avatar name={person.name} colour={person.colour} image={person.avatar} size={56} />
        <h2>{person.name}</h2>
        <span className="child-tod">{TIME_LABELS[tod]}</span>
      </header>
      {!set.loaded || !dayLoaded ? (
        <p className="hint" aria-live="polite">Loading…</p>
      ) : steps.length === 0 ? (
        <p className="hint">Nothing to do this {TIME_LABELS[tod].toLowerCase()}.</p>
      ) : (
        <>
          <ol className="steps">
            {visible.map((step) => (
              <ChildStep key={step.id} step={step} done={done.has(step.id)} symbolMode={profile.symbolMode}
                onSetDone={(d) => tick(step.id, d)} />
            ))}
          </ol>
          {allDone && <p className="all-done"><span aria-hidden="true">✓</span> All done</p>}
        </>
      )}
    </section>
  );
}
