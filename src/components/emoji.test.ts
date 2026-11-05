import { describe, expect, it } from 'vitest';
import { singleEmoji } from './emoji';

describe('singleEmoji', () => {
  it('accepts one emoji, including joined and flag emoji', () => {
    expect(singleEmoji('🪥')).toBe('🪥');
    expect(singleEmoji(' 👨‍👩‍👧 ')).toBe('👨‍👩‍👧');
    expect(singleEmoji('👍🏽')).toBe('👍🏽');
    expect(singleEmoji('🇦🇺')).toBe('🇦🇺');
  });
  it('refuses text, numbers, several emoji and blanks', () => {
    expect(singleEmoji('a')).toBeUndefined();
    expect(singleEmoji('7')).toBeUndefined();
    expect(singleEmoji('🪥🪥')).toBeUndefined();
    expect(singleEmoji('')).toBeUndefined();
  });
});
