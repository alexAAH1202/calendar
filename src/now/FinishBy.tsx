import { minutesText, urgency, finishByLeft } from './upNext';

const WINDOW_MS = 45 * 60_000;

/** "Finish by 8:20 · 12 min left · 3 steps to go", with a bar shrinking over the last 45 minutes. */
export function FinishBy({ finishBy, now, stepsLeft }: { finishBy: string; now: Date; stepsLeft: number }) {
  if (stepsLeft === 0) return null;
  const left = finishByLeft(finishBy, now);
  const [h, m] = finishBy.split(':').map(Number);
  const time = `${h % 12 || 12}:${String(m).padStart(2, '0')}`;
  const steps = `${stepsLeft} ${stepsLeft === 1 ? 'step' : 'steps'} to go`;
  if (left <= 0) {
    return <p className="finish-by finish-by--past">Finish-by time ({time}) has passed · {steps}</p>;
  }
  return (
    <div className={`finish-by finish-by--${urgency(left)}`}>
      <span className="finish-by-text">Finish by {time} · {minutesText(left)} left · {steps}</span>
      <span className="finish-by-bar" aria-hidden="true"><span style={{ width: `${Math.min(1, left / WINDOW_MS) * 100}%` }} /></span>
    </div>
  );
}
