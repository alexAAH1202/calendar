import { useEffect, useState } from 'react';
import { clockText } from '../wall/schedule';
import { playSoftCue } from './softCue';

type State = { kind: 'idle' } | { kind: 'running'; endsAt: number } | { kind: 'paused'; left: number } | { kind: 'done' };

const R = 22;
const C = 2 * Math.PI * R;

/**
 * A step's timer: a shrinking ring plus digits. Silent unless `sound` is on, and
 * nothing flashes at zero: it just says "Time’s up". Tap to start, pause, resume or reset.
 */
export function StepTimer({ seconds, sound, label }: { seconds: number; sound: boolean; label: string }) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (state.kind !== 'running') return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [state.kind]);

  const left = state.kind === 'running' ? (state.endsAt - now) / 1000 : state.kind === 'paused' ? state.left : state.kind === 'done' ? 0 : seconds;

  useEffect(() => {
    if (state.kind === 'running' && left <= 0) {
      setState({ kind: 'done' });
      if (sound) playSoftCue();
    }
  }, [state.kind, left, sound]);

  const press = () => {
    const t = Date.now();
    setNow(t);
    if (state.kind === 'idle') setState({ kind: 'running', endsAt: t + seconds * 1000 });
    else if (state.kind === 'running') setState({ kind: 'paused', left });
    else if (state.kind === 'paused') setState({ kind: 'running', endsAt: t + left * 1000 });
    else setState({ kind: 'idle' });
  };

  const fraction = Math.max(0, Math.min(1, left / seconds));
  const words =
    state.kind === 'idle' ? `Start the ${clockText(seconds)} timer for ${label}`
    : state.kind === 'running' ? `${clockText(left)} left for ${label}. Pause`
    : state.kind === 'paused' ? `Paused at ${clockText(left)}. Carry on`
    : `Time’s up for ${label}. Reset`;

  return (
    <button type="button" className={`timer timer--${state.kind}`} onClick={press} aria-label={words}>
      {state.kind === 'idle' ? (
        <span className="timer-start"><span aria-hidden="true">▶</span> {clockText(seconds)}</span>
      ) : state.kind === 'done' ? (
        <span className="timer-done">Time’s up</span>
      ) : (
        <>
          <svg className="timer-ring" viewBox="0 0 52 52" aria-hidden="true">
            <circle cx="26" cy="26" r={R} className="timer-track" />
            <circle cx="26" cy="26" r={R} className="timer-left" strokeDasharray={C} strokeDashoffset={C * (1 - fraction)}
              transform="rotate(-90 26 26)" />
          </svg>
          <span className="timer-digits">{clockText(left)}{state.kind === 'paused' ? ' ⏸' : ''}</span>
        </>
      )}
    </button>
  );
}
