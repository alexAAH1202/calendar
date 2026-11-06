import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { SymbolMode } from '../data/types';
import type { ListItem } from './EditStep';
import { StepTimer } from './StepTimer';
import { StepImage } from './StepImage';

interface Props {
  step: ListItem;
  done: boolean;
  /** A small note under the title, e.g. "From Tuesday". */
  note?: string;
  onSetDone: (done: boolean) => void;
  symbolMode?: SymbolMode;
  /** Shown at the right of the card, e.g. the person's initial. */
  badge?: ReactNode;
  /** For days other than today: shown, not tickable. */
  readOnly?: boolean;
  /** The person's colour, for a card in a mixed list. */
  accent?: string;
  /** Shows a timer button beside the step. */
  timerSeconds?: number;
  /** The timer's soft cue at zero (the child's sound setting). */
  sound?: boolean;
  /** Larger card, for First–Then. */
  big?: boolean;
}

const CONFIRM_MS = 4000;

/**
 * One step on the child view. A tap ticks it. Un-ticking needs a deliberate
 * second action: the first tap on a done step shows an "Not done" button,
 * which hides itself again after a few seconds.
 */
export function ChildStep({ step, done, note, onSetDone, symbolMode = 'symbolsText', badge, readOnly = false, accent, timerSeconds, sound = false, big = false }: Props) {
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
    <li className={`step ${done ? 'step--done' : ''} ${big ? 'step--big' : ''}`} style={accent ? ({ '--accent': accent } as CSSProperties) : undefined}>
      <button
        type="button"
        className="step-main"
        aria-pressed={done}
        disabled={readOnly}
        onClick={() => (done ? setConfirming(true) : onSetDone(true))}
      >
        <span className="tick" aria-hidden="true">{done ? '✓' : ''}</span>
        {symbolMode !== 'text' && <StepImage image={step.image} />}
        <span className={symbolMode === 'symbols' ? 'visually-hidden' : 'step-title'}>
          {step.title}
          {note && <span className="step-meta">{note}</span>}
        </span>
        {done && <span className="visually-hidden">(done)</span>}
        {badge}
      </button>
      {timerSeconds && !done && !readOnly ? <StepTimer seconds={timerSeconds} sound={sound} label={step.title} /> : null}
      {confirming && (
        <button type="button" className="untick" onClick={() => onSetDone(false)}>
          Not done
        </button>
      )}
    </li>
  );
}
