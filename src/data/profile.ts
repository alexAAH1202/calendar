import type { PaletteName, Person, SensoryProfile, TextSize } from './types';

export const DEFAULT_PROFILE: SensoryProfile = {
  sound: false,
  animation: 'none',
  textSize: 'normal',
  symbolMode: 'symbolsText',
  completedBehaviour: 'stay',
  palette: 'calm',
  brightness: 1,
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
}

/** Muted per-child palettes. Every text colour meets WCAG AA on its surface (tested). */
export const PALETTES: Record<PaletteName, Palette> = {
  calm: { label: 'Calm', bg: '#f4f1ea', surface: '#fffdf8', text: '#2b2a27', muted: '#5f5b53' },
  warm: { label: 'Warm', bg: '#f6ece2', surface: '#fff8f1', text: '#3a2a1f', muted: '#6b5444' },
  cool: { label: 'Cool', bg: '#e8eef2', surface: '#f7fafc', text: '#1f2b33', muted: '#4c5c66' },
  contrast: { label: 'High contrast', bg: '#ffffff', surface: '#ffffff', text: '#000000', muted: '#333333' },
};

/** Accent colours offered for each person. All reach 3:1 against every surface for the tick box. */
export const PERSON_COLOURS = ['#5b8a72', '#4f6d9a', '#9a5b7a', '#8a6d3b', '#6b5b9a', '#3f7f8a'];

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
