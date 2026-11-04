import { describe, expect, it } from 'vitest';
import { moveById, moveDown, moveItem, moveUp, removeById, sameOrder } from './order';

const list = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => ({ id }));
const ids = (l: { id: string }[]) => l.map((x) => x.id).join('');

describe('moveItem', () => {
  it('moves forward and backward', () => {
    expect(ids(moveItem(list, 0, 3))).toBe('bcdaefgh');
    expect(ids(moveItem(list, 7, 0))).toBe('habcdefg');
  });
  it('never mutates the input', () => {
    moveItem(list, 0, 7);
    expect(ids(list)).toBe('abcdefgh');
  });
  it('ignores out-of-range and no-op moves', () => {
    expect(ids(moveItem(list, -1, 2))).toBe('abcdefgh');
    expect(ids(moveItem(list, 2, 99))).toBe('abcdefgh');
    expect(ids(moveItem(list, 2, 2))).toBe('abcdefgh');
  });
});

describe('moveById', () => {
  it('drops the active item where the target was', () => {
    expect(ids(moveById(list, 'b', 'f'))).toBe('acdefbgh');
    expect(ids(moveById(list, 'f', 'b'))).toBe('afbcdegh');
  });
  it('ignores unknown ids', () => {
    expect(ids(moveById(list, 'zz', 'b'))).toBe('abcdefgh');
  });
});

describe('arrow moves', () => {
  it('moves up and down by one', () => {
    expect(ids(moveUp(list, 'c'))).toBe('acbdefgh');
    expect(ids(moveDown(list, 'c'))).toBe('abdcefgh');
  });
  it('is a no-op at the ends', () => {
    expect(ids(moveUp(list, 'a'))).toBe('abcdefgh');
    expect(ids(moveDown(list, 'h'))).toBe('abcdefgh');
  });
  it('arrows and drag give the same result', () => {
    let viaArrows = list.slice();
    for (let i = 0; i < 3; i++) viaArrows = moveDown(viaArrows, 'b');
    expect(ids(viaArrows)).toBe(ids(moveById(list, 'b', 'e')));
  });
});

describe('removeById / sameOrder', () => {
  it('removes one item', () => {
    expect(ids(removeById(list, 'd'))).toBe('abcefgh');
  });
  it('compares order', () => {
    expect(sameOrder(list, list.slice())).toBe(true);
    expect(sameOrder(list, moveUp(list, 'b'))).toBe(false);
  });
});
