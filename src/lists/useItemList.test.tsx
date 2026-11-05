import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createLocalStore } from '../data/localStore';
import { useItemList } from './useItemList';

beforeEach(() => window.localStorage.clear());
type Item = { id: string };
const ids = (l: Item[]) => l.map((i) => i.id).join('');

describe('useItemList', () => {
  it('saves, survives a remount, and undoes', async () => {
    const store = createLocalStore();
    const a = renderHook(({ s }) => useItemList<Item>(s, ['braindump', 'u1']), { initialProps: { s: store } });
    expect(a.result.current.loaded).toBe(true);
    act(() => a.result.current.commit([{ id: 'x' }]));
    act(() => a.result.current.commit([{ id: 'x' }, { id: 'y' }]));
    act(() => a.result.current.undo());
    expect(ids(a.result.current.items)).toBe('x');
    await act(async () => {});
    a.unmount();
    const b = renderHook(({ s }) => useItemList<Item>(s, ['braindump', 'u1']), { initialProps: { s: createLocalStore() } });
    expect(ids(b.result.current.items)).toBe('x');
  });

  it('a change in another tab shows and is reported', () => {
    const store = createLocalStore();
    const { result } = renderHook(({ s }) => useItemList<Item>(s, ['chores', 'p1']), { initialProps: { s: store } });
    act(() => {
      window.localStorage.setItem('fwc:chores/p1', JSON.stringify({ items: [{ id: 'z' }] }));
      window.dispatchEvent(new StorageEvent('storage', { key: 'fwc:chores/p1' }));
    });
    expect(ids(result.current.items)).toBe('z');
    expect(result.current.updatedElsewhere).toBe(true);
  });
});
