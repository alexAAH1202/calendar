import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalStore } from './localStore';
import { SEED_ROUTINE } from './seed';
import type { FamilyStore, RoutineSnapshot } from './store';
import type { Routine } from './types';
import { useRoutine } from './useRoutine';

const ids = (r: { current: ReturnType<typeof useRoutine> }) => r.current.steps.map((s) => s.id).join(',');

beforeEach(() => window.localStorage.clear());

/** A store whose routine listener the test can drive, as if another device wrote. */
function fakeStore(overrides: Partial<FamilyStore> = {}) {
  let emit: (s: RoutineSnapshot) => void = () => {};
  const store: FamilyStore = {
    subscribeRoutine: (_id, cb) => {
      emit = cb;
      cb({ routine: undefined, local: false, pendingSync: false }); // like the real stores: an initial snapshot
      return () => {};
    },
    saveRoutine: async () => {},
    subscribeDay: () => () => {},
    setStepDone: async () => {},
    onWriteError: () => () => {},
    ...overrides,
  };
  return { store, remote: (routine: Routine) => emit({ routine, local: false, pendingSync: false }) };
}

describe('useRoutine', () => {
  it('reorders at once and the order survives a remount (reload)', async () => {
    const store = createLocalStore();
    const first = renderHook(() => useRoutine(store, SEED_ROUTINE));
    act(() => first.result.current.dragMove('s1', 's4'));
    act(() => first.result.current.moveUp('s8'));
    const after = ids(first.result);
    expect(after).toBe('s2,s3,s4,s1,s5,s6,s8,s7');
    await act(async () => {}); // let queued writes finish
    first.unmount();
    const second = renderHook(({ store }) => useRoutine(store, SEED_ROUTINE), { initialProps: { store: createLocalStore() } });
    expect(ids(second.result)).toBe(after);
  });

  it('never reverts the visible order when a save fails', async () => {
    const { store } = fakeStore({ saveRoutine: vi.fn().mockRejectedValue(new Error('offline')) });
    const { result } = renderHook(() => useRoutine(store, SEED_ROUTINE));
    act(() => result.current.moveDown('s1'));
    await act(async () => {});
    expect(result.current.saveFailing).toBe(true);
    expect(ids(result)).toBe('s2,s1,s3,s4,s5,s6,s7,s8');
  });

  it('undo restores the previous order, up to 10 steps back', () => {
    const { result } = renderHook(({ store }) => useRoutine(store, SEED_ROUTINE), { initialProps: { store: createLocalStore() } });
    for (let i = 0; i < 7; i++) act(() => result.current.moveDown('s1')); // s1 to the end
    for (let i = 0; i < 5; i++) act(() => result.current.moveUp('s1')); // 12 real moves
    for (let i = 0; i < 10; i++) act(() => result.current.undo());
    expect(result.current.canUndo).toBe(false);
    expect(ids(result)).toBe('s2,s3,s1,s4,s5,s6,s7,s8'); // state after move 2
  });

  it('a no-op arrow (top of list) adds nothing to undo', () => {
    const { result } = renderHook(({ store }) => useRoutine(store, SEED_ROUTINE), { initialProps: { store: createLocalStore() } });
    act(() => result.current.moveUp('s1'));
    expect(result.current.canUndo).toBe(false);
  });

  it('adds a step with its emoji and changes an emoji', () => {
    const { result } = renderHook(({ store }) => useRoutine(store, SEED_ROUTINE), { initialProps: { store: createLocalStore() } });
    act(() => result.current.add('Feed the dog', '🐶'));
    const added = result.current.steps.at(-1)!;
    expect(added).toMatchObject({ title: 'Feed the dog', image: 'emoji:🐶' });
    act(() => result.current.setEmoji(added.id, '🐱'));
    expect(result.current.steps.at(-1)!.image).toBe('emoji:🐱');
  });

  it('shows a change from another device, says so, and clears undo', () => {
    const { store, remote } = fakeStore();
    const { result } = renderHook(() => useRoutine(store, SEED_ROUTINE));
    act(() => result.current.moveDown('s1'));
    const reversed = { ...SEED_ROUTINE, steps: [...SEED_ROUTINE.steps].reverse() };
    act(() => remote(reversed));
    expect(ids(result)).toBe('s8,s7,s6,s5,s4,s3,s2,s1');
    expect(result.current.updatedElsewhere).toBe(true);
    expect(result.current.canUndo).toBe(false);
  });

  it('the first load from the server is not reported as a change elsewhere', () => {
    let emit: (s: RoutineSnapshot) => void = () => {};
    const { store } = fakeStore({ subscribeRoutine: (_i, cb) => ((emit = cb), () => {}) });
    const { result } = renderHook(() => useRoutine(store, SEED_ROUTINE));
    expect(result.current.loaded).toBe(false);
    act(() => emit({ routine: { ...SEED_ROUTINE, steps: SEED_ROUTINE.steps.slice(0, 3) }, local: false, pendingSync: false }));
    expect(ids(result)).toBe('s1,s2,s3');
    expect(result.current.loaded).toBe(true);
    expect(result.current.updatedElsewhere).toBe(false);
  });
});
