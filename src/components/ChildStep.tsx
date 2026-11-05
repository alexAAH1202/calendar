import { useEffect, useState } from 'react';
import type { SymbolMode } from '../data/types';
import type { ListItem } from './EditStep';
import { StepImage } from './StepImage';

interface Props {
  step: ListItem;
  done: boolean;
  /** A small note under the title, e.g. "From Tuesday". */
  note?: string;
  onSetDone: (done: boolean) => void;
  symbolMode?: SymbolMode;
}

const CONFIRM_MS = 4000;

/**
 * One step on the child view. A tap ticks it. Un-ticking needs a deliberate
 * second action: the first tap on a done step shows an "Not done" button,
 * which hides itself again after a few seconds.
 */
export function ChildStep({ step, done, note, onSetDone, symbolMode = 'symbolsText' }: Props) {
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
        {symbolMode !== 'text' && <StepImage image={step.image} />}
        <span className={symbolMode === 'symbols' ? 'visually-hidden' : 'step-title'}>
          {step.title}
          {note && <span className="step-meta">{note}</span>}
        </span>
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
