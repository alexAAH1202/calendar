/** Emoji offered first in the picker: everyday routine and chore symbols. */
export const COMMON_EMOJI = [
  '🌅', '🛏️', '🚽', '🧼', '🚿', '🛁', '🪥', '💇', '👕', '👖', '🧦', '👟',
  '🧥', '🎒', '🥣', '🍎', '🥪', '🥛', '💧', '💊', '📚', '✏️', '🎹', '⚽',
  '🧸', '🧹', '🧺', '🍽️', '🐶', '🐱', '🌱', '🚗', '🚌', '🏫', '📺', '🎮',
  '🛒', '🎨', '🤗', '😴', '🌙', '⭐',
];

export const DEFAULT_EMOJI = '⭐';

/**
 * Returns the single emoji in `text`, or undefined if it is not exactly one
 * emoji (letters, numbers or several emoji are refused).
 */
export function singleEmoji(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const parts = [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(trimmed)];
  if (parts.length !== 1) return undefined;
  return /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(trimmed) ? trimmed : undefined;
}
