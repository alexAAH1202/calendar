import { describe, expect, it } from 'vitest';
import { dropWithinGroup, inGroup, moveInGroup, moveToGroup, type DumpItem, type Priority } from './braindump';

const it_ = (id: string, priority: Priority, done = false): DumpItem => ({ id, text: id, priority, done });
const items = [it_('a', 'high'), it_('b', 'medium'), it_('c', 'medium'), it_('d', 'low'), it_('e', 'medium')];
const show = (l: DumpItem[]) => ['high', 'medium', 'low'].map((p) => inGroup(l, p as Priority).map((i) => i.id).join('')).join('/');

describe('brain dump moves', () => {
  it('moves an item to the end of another group', () => {
    expect(show(moveToGroup(items, 'd', 'high', null))).toBe('ad/bce/');
  });
  it('moves an item before a given item of another group', () => {
    expect(show(moveToGroup(items, 'c', 'high', 'a'))).toBe('ca/be/d');
  });
  it('into an empty group', () => {
    expect(show(moveToGroup(items.filter((i) => i.id !== 'd'), 'a', 'low', null))).toBe('/bce/a');
  });
  it('keeps the priority on the stored item and changes nothing else', () => {
    const out = moveToGroup(items, 'b', 'high', null);
    expect(out.find((i) => i.id === 'b')).toEqual({ id: 'b', text: 'b', priority: 'high', done: false });
    expect(out).toHaveLength(items.length);
  });
  it('drops within a group like a sortable list', () => {
    expect(show(dropWithinGroup(items, 'e', 'b'))).toBe('a/ebc/d');
  });
  it('arrows step over items of other groups', () => {
    expect(show(moveInGroup(items, 'e', -1))).toBe('a/bec/d');
    expect(show(moveInGroup(items, 'b', -1))).toBe('a/bce/d'); // already first in its group
    expect(show(moveInGroup(items, 'c', 1))).toBe('a/bec/d');
  });
});
