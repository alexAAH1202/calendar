import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCompletion } from './useCompletion';

beforeEach(() => window.localStorage.clear());

describe('per-date completion and midnight swap', () => {
  it('a new day starts empty, without writing anything, and keeps the old day', () => {
    const { result, rerender } = renderHook(({ day }) => useCompletion(day, 'p1'), {
      initialProps: { day: '2026-11-05' },
    });
    act(() => result.current.setStep('s1', true));
    expect(result.current.done.has('s1')).toBe(true);

    const keysBefore = Object.keys(window.localStorage).sort();
    rerender({ day: '2026-11-06' });
    expect(result.current.done.size).toBe(0);
    expect(Object.keys(window.localStorage).sort()).toEqual(keysBefore);

    rerender({ day: '2026-11-05' });
    expect(result.current.done.has('s1')).toBe(true);
  });

  it('un-ticks', () => {
    const { result } = renderHook(() => useCompletion('2026-11-05', 'p1'));
    act(() => result.current.setStep('s1', true));
    act(() => result.current.setStep('s1', false));
    expect(result.current.done.has('s1')).toBe(false);
  });
});
