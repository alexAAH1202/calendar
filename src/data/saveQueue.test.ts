import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSaveQueue } from './saveQueue';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('save queue', () => {
  it('writes the value', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const status = vi.fn();
    createSaveQueue(write, status).save([1, 2]);
    await vi.runAllTimersAsync();
    expect(write).toHaveBeenCalledWith([1, 2]);
    expect(status).toHaveBeenLastCalledWith(false);
  });

  it('retries a failed write in the background and reports status', async () => {
    const write = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const status = vi.fn();
    createSaveQueue(write, status, [1000]).save('order');
    await vi.advanceTimersByTimeAsync(0);
    expect(status).toHaveBeenLastCalledWith(true);
    await vi.advanceTimersByTimeAsync(1000);
    expect(write).toHaveBeenCalledTimes(2);
    expect(status).toHaveBeenLastCalledWith(false);
  });

  it('a newer value replaces a failing one (never writes the stale order)', async () => {
    const write = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const q = createSaveQueue(write, () => {}, [1000]);
    q.save('old');
    await vi.advanceTimersByTimeAsync(0);
    q.save('new');
    await vi.runAllTimersAsync();
    expect(write).toHaveBeenLastCalledWith('new');
    expect(write.mock.calls.map((c) => c[0])).toEqual(['old', 'new']);
  });

  it('writes the latest value after an in-flight write finishes', async () => {
    let resolveFirst!: () => void;
    const write = vi
      .fn()
      .mockImplementationOnce(() => new Promise<void>((r) => (resolveFirst = r)))
      .mockResolvedValue(undefined);
    const q = createSaveQueue(write, () => {});
    q.save('a');
    q.save('b');
    resolveFirst();
    await vi.runAllTimersAsync();
    expect(write.mock.calls.map((c) => c[0])).toEqual(['a', 'b']);
  });
});
