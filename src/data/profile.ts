import type { PaletteName, Person, SensoryProfile, TextSize } from './types';

export const DEFAULT_PROFILE: SensoryProfile = {
  sound: false,
  animation: 'none',
  textSize: 'normal',
  symbolMode: 'symbolsText',
  completedBehaviour: 'stay',
  palette: 'calm',
  brightness: 1,
  layout: 'checklist',
  celebration: 'gentle',
};

export function profileOf(person: Person): SensoryProfile {
  return { ...DEFAULT_PROFILE, ...person.sensory };
}

/** Child text sizes in CSS px; the smallest meets the spec's 24 sp minimum. */
export const TEXT_SIZES: Record<TextSize, number> = { normal: 28, large: 34, larger: 40, largest: 48 };

export interface Palette {
  label: string;
  bg: string;
  surface: string;
  text: string;
  muted: string;
  /** How strongly cards are tinted with the person's colour (0 to 1). */
  tint: number;
}

/** Muted per-child palettes. Every text colour meets WCAG AA on its surface (tested). */
export const PALETTES: Record<PaletteName, Palette> = {
  calm: { label: 'Calm', bg: '#ffffff', surface: '#ffffff', text: '#1d2433', muted: '#4f5866', tint: 0.24 },
  warm: { label: 'Warm', bg: '#fff8f1', surface: '#fffaf5', text: '#3a2a1f', muted: '#5f4a3b', tint: 0.24 },
  cool: { label: 'Cool', bg: '#f3f8fb', surface: '#f7fafc', text: '#1f2b33', muted: '#46555f', tint: 0.24 },
  contrast: { label: 'High contrast', bg: '#ffffff', surface: '#ffffff', text: '#000000', muted: '#333333', tint: 0 },
};

/**
 * Accent colours offered for each person: bright enough for pastel cards, dark enough
 * that a white tick or initial reads on them and they reach 3:1 against every surface (tested).
 */
export const PERSON_COLOURS = ['#1f8a7a', '#c8553d', '#c2477a', '#a8661f', '#7b5cc4', '#2f6fd6'];

/** The earlier, more muted defaults, shown as their brighter equivalents. */
const EARLIER_DEFAULTS: Record<string, string> = {
  '#5b8a72': '#1f8a7a',
  '#4f6d9a': '#c8553d',
  '#9a5b7a': '#c2477a',
  '#8a6d3b': '#a8661f',
  '#6b5b9a': '#7b5cc4',
  '#3f7f8a': '#2f6fd6',
};

/** A person's colour for display: an earlier default becomes its brighter equivalent. */
export function personColour(colour: string): string {
  return EARLIER_DEFAULTS[colour.toLowerCase()] ?? colour;
}

/** `colour` mixed into `surface` by `amount` (0 to 1), as CSS color-mix(in srgb) does. */
export function tint(colour: string, surface: string, amount: number): string {
  const ch = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
  return (
    '#' +
    [1, 3, 5]
      .map((i) => Math.round(ch(colour, i) * amount + ch(surface, i) * (1 - amount)).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** WCAG relative luminance contrast ratio between two #rrggbb colours. */
export function contrastRatio(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
