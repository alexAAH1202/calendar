import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SEED_ROUTINE } from './seed';
import * as storage from './storage';
import { useRoutine } from './useRoutine';

const ids = (r: { current: ReturnType<typeof useRoutine> }) => r.current.steps.map((s) => s.id).join(',');

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe('useRoutine', () => {
  it('reorders at once and the order survives a remount (reload)', async () => {
    const first = renderHook(() => useRoutine(SEED_ROUTINE));
    act(() => first.result.current.dragMove('s1', 's4'));
    act(() => first.result.current.moveUp('s8'));
    const after = ids(first.result);
    expect(after).toBe('s2,s3,s4,s1,s5,s6,s8,s7');
    await act(async () => {}); // let queued writes finish
    first.unmount();
    const second = renderHook(() => useRoutine(SEED_ROUTINE));
    expect(ids(second.result)).toBe(after);
  });

  it('never reverts the visible order when a save fails', async () => {
    vi.spyOn(storage, 'saveRoutine').mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useRoutine(SEED_ROUTINE));
    act(() => result.current.moveDown('s1'));
    await act(async () => {});
    expect(result.current.saveFailing).toBe(true);
    expect(ids(result)).toBe('s2,s1,s3,s4,s5,s6,s7,s8');
  });

  it('undo restores the previous order, up to 10 steps back', () => {
    const { result } = renderHook(() => useRoutine(SEED_ROUTINE));
    for (let i = 0; i < 7; i++) act(() => result.current.moveDown('s1')); // s1 to the end
    for (let i = 0; i < 5; i++) act(() => result.current.moveUp('s1')); // 12 real moves
    for (let i = 0; i < 10; i++) act(() => result.current.undo());
    expect(result.current.canUndo).toBe(false);
    expect(ids(result)).toBe('s2,s3,s1,s4,s5,s6,s7,s8'); // state after move 2
  });

  it('a no-op arrow (top of list) adds nothing to undo', () => {
    const { result } = renderHook(() => useRoutine(SEED_ROUTINE));
    act(() => result.current.moveUp('s1'));
    expect(result.current.canUndo).toBe(false);
  });
});
