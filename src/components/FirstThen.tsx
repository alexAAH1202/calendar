import type { Step, SymbolMode } from '../data/types';
import { ChildStep } from './ChildStep';
import { StepImage } from './StepImage';

interface Props {
  steps: Step[];
  done: Set<string>;
  onSetDone: (id: string, done: boolean) => void;
  symbolMode: SymbolMode;
  rewardLabel: string;
}

/** One step at a time: "First" the next step to do (tickable, big), "Then" the one after, or the reward. */
export function FirstThen({ steps, done, onSetDone, symbolMode, rewardLabel }: Props) {
  const open = steps.filter((s) => !done.has(s.id));
  const [first, then] = open;
  if (!first) return null;
  return (
    <div className="first-then">
      <div className="ft-part">
        <span className="ft-label">First</span>
        <ol className="steps">
          <ChildStep step={first} done={false} symbolMode={symbolMode} big
            onSetDone={(d) => onSetDone(first.id, d)} />
        </ol>
      </div>
      <span className="ft-arrow" aria-hidden="true">→</span>
      <div className="ft-part ft-part--then">
        <span className="ft-label">Then</span>
        <div className="ft-then">
          {then ? (
            <>
              {symbolMode !== 'text' && <StepImage image={then.image} />}
              <span className={symbolMode === 'symbols' ? 'visually-hidden' : ''}>{then.title}</span>
            </>
          ) : (
            <><span className="step-image" aria-hidden="true">⭐</span><span>{rewardLabel}</span></>
          )}
        </div>
      </div>
      <p className="ft-left">{open.length} {open.length === 1 ? 'step' : 'steps'} to go</p>
    </div>
  );
}
