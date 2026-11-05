import type { Template } from './types';

const step = (id: string, title: string, emoji: string) => ({ id, title, image: `emoji:${emoji}`, stars: 1 });

/** Starter templates that come with the app. Applying one copies its steps with new ids. */
export const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: 'builtin_school_morning',
    name: 'School morning',
    timeOfDay: 'morning',
    builtIn: true,
    steps: [
      step('a', 'Wake up', '🌅'),
      step('b', 'Go to the toilet', '🚽'),
      step('c', 'Get dressed', '👕'),
      step('d', 'Eat breakfast', '🥣'),
      step('e', 'Brush teeth', '🪥'),
      step('f', 'Shoes on', '👟'),
      step('g', 'Pack school bag', '🎒'),
    ],
  },
  {
    id: 'builtin_after_school',
    name: 'After school',
    timeOfDay: 'afternoon',
    builtIn: true,
    steps: [
      step('a', 'Bag away', '🎒'),
      step('b', 'Wash hands', '🧼'),
      step('c', 'Snack', '🍎'),
      step('d', 'Drink of water', '💧'),
      step('e', 'Play time', '🧸'),
      step('f', 'Reading', '📚'),
    ],
  },
  {
    id: 'builtin_bedtime',
    name: 'Bedtime',
    timeOfDay: 'evening',
    builtIn: true,
    steps: [
      step('a', 'Dinner', '🍽️'),
      step('b', 'Bath', '🛁'),
      step('c', 'Pyjamas on', '🌙'),
      step('d', 'Brush teeth', '🪥'),
      step('e', 'Story', '📚'),
      step('f', 'Lights out', '😴'),
    ],
  },
];
