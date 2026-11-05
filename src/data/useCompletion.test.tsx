import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalStore } from './localStore';
import { useCompletion } from './useCompletion';

beforeEach(() => window.localStorage.clear());

describe('per-date completion and midnight swap', () => {
  it('a new day starts empty, without writing anything, and keeps the old day', async () => {
    const store = createLocalStore();
    const { result, rerender } = renderHook(({ day }) => useCompletion(store, day, 'p1'), {
      initialProps: { day: '2026-11-05' },
    });
    await act(async () => result.current.setStep('s1', true));
    expect(result.current.done.has('s1')).toBe(true);

    const keysBefore = Object.keys(window.localStorage).sort();
    rerender({ day: '2026-11-06' });
    expect(result.current.done.size).toBe(0);
    expect(Object.keys(window.localStorage).sort()).toEqual(keysBefore);

    rerender({ day: '2026-11-05' });
    expect(result.current.done.has('s1')).toBe(true);
  });

  it('un-ticks', async () => {
    const { result } = renderHook(({ store }) => useCompletion(store, '2026-11-05', 'p1'), { initialProps: { store: createLocalStore() } });
    await act(async () => result.current.setStep('s1', true));
    await act(async () => result.current.setStep('s1', false));
    expect(result.current.done.has('s1')).toBe(false);
  });
});
