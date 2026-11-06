/** Short, warm words for a ticked step; picked in turn so they vary without being random noise. */
export const CHEERS = ['Nice one!', 'Great job!', 'You did it!', 'Awesome!', 'Way to go!', 'Brilliant!', 'Super!'];

export function cheerFor(index: number): string {
  return CHEERS[((index % CHEERS.length) + CHEERS.length) % CHEERS.length];
}

/** "3 of 8 done", or "All done!" */
export function progressText(done: number, total: number): string {
  return done >= total && total > 0 ? 'All done!' : `${done} of ${total} done`;
}
