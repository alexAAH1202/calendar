/**
 * Writes the latest value, retrying in the background on failure.
 * The caller's visible state is never reverted: a failed write only raises
 * `failing`, and a newer value replaces any pending retry (last value wins).
 */
export interface SaveQueue<T> {
  save(value: T): void;
  retryNow(): void;
  dispose(): void;
}

export function createSaveQueue<T>(
  write: (value: T) => Promise<void>,
  onStatus: (failing: boolean) => void,
  delays: number[] = [2000, 5000, 15000, 30000],
): SaveQueue<T> {
  let pending: { value: T } | undefined;
  let inFlight = false;
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  const run = async () => {
    if (inFlight || !pending) return;
    clearTimeout(timer);
    const current = pending;
    inFlight = true;
    try {
      await write(current.value);
      if (pending === current) pending = undefined;
      attempt = 0;
      onStatus(false);
    } catch {
      if (disposed) return;
      onStatus(true);
      const delay = delays[Math.min(attempt, delays.length - 1)];
      attempt++;
      timer = setTimeout(run, delay);
    } finally {
      inFlight = false;
    }
    // A newer value arrived while writing: write it now.
    if (pending && pending !== current && attempt === 0) void run();
  };

  return {
    save(value) {
      pending = { value };
      attempt = 0;
      void run();
    },
    retryNow() {
      attempt = 0;
      void run();
    },
    /** Stops background retries. A write already queued still goes out once. */
    dispose() {
      disposed = true;
      clearTimeout(timer);
    },
  };
}
