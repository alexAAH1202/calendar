import { useEffect, useState } from 'react';
import type { Step } from '../data/types';
import { StepImage } from './StepImage';

interface Props {
  step: Step;
  done: boolean;
  onSetDone: (done: boolean) => void;
}

const CONFIRM_MS = 4000;

/**
 * One step on the child view. A tap ticks it. Un-ticking needs a deliberate
 * second action: the first tap on a done step shows an "Not done" button,
 * which hides itself again after a few seconds.
 */
export function ChildStep({ step, done, onSetDone }: Props) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = window.setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => window.clearTimeout(t);
  }, [confirming]);

  useEffect(() => {
    if (!done) setConfirming(false);
  }, [done]);

  return (
    <li className={`step ${done ? 'step--done' : ''}`}>
      <button
        type="button"
        className="step-main"
        aria-pressed={done}
        onClick={() => (done ? setConfirming(true) : onSetDone(true))}
      >
        <span className="tick" aria-hidden="true">{done ? '✓' : ''}</span>
        <StepImage image={step.image} />
        <span className="step-title">{step.title}</span>
        {done && <span className="visually-hidden">(done)</span>}
      </button>
      {confirming && (
        <button type="button" className="untick" onClick={() => onSetDone(false)}>
          Not done
        </button>
      )}
    </li>
  );
}
