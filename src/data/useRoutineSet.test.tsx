import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalStore } from './localStore';
import { SEED_ROUTINE } from './seed';
import type { FamilyStore, RoutineSnapshot } from './store';
import type { Routine } from './types';
import { useRoutineSet } from './useRoutineSet';

const M = SEED_ROUTINE;
const E: Routine = { id: 'r_child_evening', personId: 'p_child', timeOfDay: 'evening', steps: [], updatedAt: 0 };
type Hook = { current: ReturnType<typeof useRoutineSet> };
const ids = (r: Hook, rid = M.id) => r.current.routines[rid].steps.map((s) => s.id).join(',');

beforeEach(() => window.localStorage.clear());

function fakeStore(overrides: Partial<FamilyStore> = {}) {
  const emits: Record<string, (s: RoutineSnapshot) => void> = {};
  const noop = () => () => {};
  const store: FamilyStore = {
    subscribeRoutine: (id, cb) => {
      emits[id] = cb;
      cb({ routine: undefined, local: false, pendingSync: false }); // like the real stores
      return () => {};
    },
    saveRoutine: async () => {},
    subscribeDay: noop,
    setStepDone: async () => {},
    subscribePeople: noop,
    savePerson: async () => {},
    deletePerson: async () => {},
    subscribeTemplates: noop,
    saveTemplate: async () => {},
    deleteTemplate: async () => {},
    onWriteError: noop,
    ...overrides,
  };
  return { store, remote: (r: Routine) => emits[r.id]({ routine: r, local: false, pendingSync: false }) };
}

const setup = (store: FamilyStore = createLocalStore(), seeds = [M, E]) =>
  renderHook(({ s }) => useRoutineSet(s, seeds), { initialProps: { s: store } });

describe('useRoutineSet', () => {
  it('reorders at once and the order survives a remount (reload)', async () => {
    const store = createLocalStore();
    const first = setup(store);
    act(() => first.result.current.dragMove(M.id, 's1', 's4'));
    act(() => first.result.current.moveUp(M.id, 's8'));
    const after = ids(first.result);
    expect(after).toBe('s2,s3,s4,s1,s5,s6,s8,s7');
    await act(async () => {});
    first.unmount();
    expect(ids(setup(createLocalStore()).result)).toBe(after);
  });

  it('never reverts the visible order when a save fails', async () => {
    const { store } = fakeStore({ saveRoutine: vi.fn().mockRejectedValue(new Error('offline')) });
    const { result } = setup(store);
    act(() => result.current.moveDown(M.id, 's1'));
    await act(async () => {});
    expect(result.current.saveFailing).toBe(true);
    expect(ids(result)).toBe('s2,s1,s3,s4,s5,s6,s7,s8');
  });

  it('undo goes back up to 10 changes; no-op moves add nothing', () => {
    const { result } = setup();
    act(() => result.current.moveUp(M.id, 's1'));
    expect(result.current.canUndo).toBe(false);
    for (let i = 0; i < 7; i++) act(() => result.current.moveDown(M.id, 's1'));
    for (let i = 0; i < 5; i++) act(() => result.current.moveUp(M.id, 's1'));
    for (let i = 0; i < 10; i++) act(() => result.current.undo());
    expect(result.current.canUndo).toBe(false);
    expect(ids(result)).toBe('s2,s3,s1,s4,s5,s6,s7,s8');
  });

  it('moves a step to another time of day, and one undo puts it back', () => {
    const { result } = setup();
    act(() => result.current.moveTo(M.id, E.id, 's8'));
    expect(ids(result)).toBe('s1,s2,s3,s4,s5,s6,s7');
    expect(ids(result, E.id)).toBe('s8');
    act(() => result.current.undo());
    expect(ids(result)).toBe('s1,s2,s3,s4,s5,s6,s7,s8');
    expect(ids(result, E.id)).toBe('');
  });

  it('applies a template with fresh step ids, appending or replacing', () => {
    const { result } = setup();
    const tpl = [{ id: 's1', title: 'Bath', image: 'emoji:🛁', stars: 1 }];
    act(() => result.current.applyTemplate(E.id, tpl, 'append'));
    act(() => result.current.applyTemplate(E.id, tpl, 'append'));
    const evening = result.current.routines[E.id].steps;
    expect(evening.map((s) => s.title)).toEqual(['Bath', 'Bath']);
    expect(new Set(evening.map((s) => s.id)).size).toBe(2);
    expect(evening.some((s) => s.id === 's1')).toBe(false); // never reuses an id ticks are keyed on
    act(() => result.current.applyTemplate(M.id, tpl, 'replace'));
    expect(result.current.routines[M.id].steps.map((s) => s.title)).toEqual(['Bath']);
    act(() => result.current.undo());
    expect(ids(result)).toBe('s1,s2,s3,s4,s5,s6,s7,s8');
  });

  it('adds a step with its emoji and changes an emoji', () => {
    const { result } = setup();
    act(() => result.current.add(E.id, 'Feed the dog', '🐶'));
    const added = result.current.routines[E.id].steps[0];
    expect(added).toMatchObject({ title: 'Feed the dog', image: 'emoji:🐶' });
    act(() => result.current.setEmoji(E.id, added.id, '🐱'));
    expect(result.current.routines[E.id].steps[0].image).toBe('emoji:🐱');
  });

  it('shows a change from another device, says so, and clears undo', () => {
    const { store, remote } = fakeStore();
    const { result } = setup(store);
    act(() => result.current.moveDown(M.id, 's1'));
    act(() => remote({ ...M, steps: [...M.steps].reverse() }));
    expect(ids(result)).toBe('s8,s7,s6,s5,s4,s3,s2,s1');
    expect(result.current.updatedElsewhere).toBe(true);
    expect(result.current.canUndo).toBe(false);
  });

  it('is not loaded until every routine has been read, and the first read is not "elsewhere"', () => {
    const emits: Record<string, (s: RoutineSnapshot) => void> = {};
    const { store } = fakeStore({ subscribeRoutine: (id, cb) => ((emits[id] = cb), () => {}) });
    const { result } = setup(store);
    expect(result.current.loaded).toBe(false);
    act(() => emits[M.id]({ routine: { ...M, steps: M.steps.slice(0, 3) }, local: false, pendingSync: false }));
    expect(result.current.loaded).toBe(false);
    act(() => emits[E.id]({ routine: undefined, local: false, pendingSync: false }));
    expect(result.current.loaded).toBe(true);
    expect(ids(result)).toBe('s1,s2,s3');
    expect(result.current.updatedElsewhere).toBe(false);
  });
});
