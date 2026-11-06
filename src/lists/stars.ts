/**
 * Stars: a step earns its stars the first time it is ticked on a day. Un-ticking
 * the same day takes them back (so a tick, un-tick, tick earns them once). The
 * midnight swap reads a new day document and never touches the bank.
 */
export function starChange(opts: { done: boolean; alreadyStarred: boolean; stars: number }): number {
  if (opts.done) return opts.alreadyStarred ? 0 : opts.stars;
  return opts.alreadyStarred ? -opts.stars : 0;
}

/** rewards/{personId} */
export interface Reward {
  /** Stars needed for the reward. */
  target: number;
  label: string;
  banked: number;
}

export const DEFAULT_REWARD: Reward = { target: 20, label: 'A treat', banked: 0 };

/** 0 to 1, for the progress bar. */
export const rewardProgress = (r: Reward) => (r.target > 0 ? Math.min(1, Math.max(0, r.banked) / r.target) : 0);
