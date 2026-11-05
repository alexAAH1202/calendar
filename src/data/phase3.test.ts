import { describe, expect, it } from 'vitest';
import { displaySteps } from './display';
import { PALETTES, PERSON_COLOURS, TEXT_SIZES, contrastRatio, profileOf } from './profile';
import { routineId, timeOfDayAt } from './timeOfDay';

const steps = ['a', 'b', 'c', 'd'].map((id) => ({ id, title: id, stars: 1 }));
const ids = (l: { id: string }[]) => l.map((s) => s.id).join('');

describe('displaySteps', () => {
  const done = new Set(['a', 'c']);
  it('stay keeps the stored order', () => expect(ids(displaySteps(steps, done, 'stay'))).toBe('abcd'));
  it('moveToBottom keeps relative order of both groups', () =>
    expect(ids(displaySteps(steps, done, 'moveToBottom'))).toBe('bdac'));
  it('hide removes done steps', () => expect(ids(displaySteps(steps, done, 'hide'))).toBe('bd'));
  it('never changes the stored array', () => {
    displaySteps(steps, done, 'moveToBottom');
    expect(ids(steps)).toBe('abcd');
  });
});

describe('time of day', () => {
  it('switches at noon and 5 pm local time', () => {
    expect(timeOfDayAt(new Date(2026, 10, 5, 11, 59))).toBe('morning');
    expect(timeOfDayAt(new Date(2026, 10, 5, 12, 0))).toBe('afternoon');
    expect(timeOfDayAt(new Date(2026, 10, 5, 16, 59))).toBe('afternoon');
    expect(timeOfDayAt(new Date(2026, 10, 5, 17, 0))).toBe('evening');
    expect(timeOfDayAt(new Date(2026, 10, 5, 0, 30))).toBe('morning');
  });
  it('keeps the existing routine id for the first child', () => {
    expect(routineId('p_child', 'morning')).toBe('r_child_morning');
    expect(routineId('p_x1', 'evening')).toBe('r_x1_evening');
  });
});

describe('sensory profile', () => {
  it('defaults: sound off, no motion, done steps stay', () => {
    const p = profileOf({ id: 'p', name: 'A', role: 'child', colour: '#000000' });
    expect(p).toMatchObject({ sound: false, animation: 'none', completedBehaviour: 'stay' });
  });
  it('the smallest child text is at least 24 px', () => {
    expect(Math.min(...Object.values(TEXT_SIZES))).toBeGreaterThanOrEqual(24);
  });
});

describe('contrast (WCAG AA)', () => {
  for (const [name, p] of Object.entries(PALETTES)) {
    it(`${name}: text 4.5:1 on surface and background`, () => {
      for (const ground of [p.surface, p.bg]) {
        expect(contrastRatio(p.text, ground)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(p.muted, ground)).toBeGreaterThanOrEqual(4.5);
      }
    });
    it(`${name}: every person colour reaches 3:1 for the tick box`, () => {
      for (const c of PERSON_COLOURS) expect(contrastRatio(c, p.surface)).toBeGreaterThanOrEqual(3);
    });
  }
  it('white tick on every person colour reaches 3:1', () => {
    for (const c of PERSON_COLOURS) expect(contrastRatio('#ffffff', c)).toBeGreaterThanOrEqual(3);
  });
});
