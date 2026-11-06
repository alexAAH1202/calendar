import { describe, expect, it } from 'vitest';
import { CHEERS, cheerFor, progressText } from './celebrate';

describe('celebrations', () => {
  it('cheers take turns and wrap', () => {
    expect(cheerFor(0)).toBe(CHEERS[0]);
    expect(cheerFor(CHEERS.length)).toBe(CHEERS[0]);
    expect(new Set(CHEERS.map((_, i) => cheerFor(i))).size).toBe(CHEERS.length);
  });
  it('progress words', () => {
    expect(progressText(3, 8)).toBe('3 of 8 done');
    expect(progressText(8, 8)).toBe('All done!');
    expect(progressText(0, 0)).toBe('0 of 0 done');
  });
});
