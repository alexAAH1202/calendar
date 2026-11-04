import { describe, expect, it } from 'vitest';
import { canUndo, createUndoStack, popUndo, pushUndo } from './undo';

describe('undo stack', () => {
  it('pops in reverse order', () => {
    let s = createUndoStack<number>();
    s = pushUndo(s, 1);
    s = pushUndo(s, 2);
    const [a, s2] = popUndo(s);
    const [b, s3] = popUndo(s2);
    expect([a, b]).toEqual([2, 1]);
    expect(canUndo(s3)).toBe(false);
    expect(popUndo(s3)[0]).toBeUndefined();
  });
  it('keeps only the last 10', () => {
    let s = createUndoStack<number>();
    for (let i = 1; i <= 15; i++) s = pushUndo(s, i);
    expect(s.entries).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });
});
