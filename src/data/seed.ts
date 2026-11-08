import type { Person, Routine } from './types';

/** Phase 1: one child, one Morning routine of 8 steps. Emoji are placeholders until a symbol library is chosen. */
export const SEED_CHILD: Person = { id: 'p_child', name: 'Ava', role: 'child', colour: '#1f8a7a' };

export const SEED_ROUTINE: Routine = {
  id: 'r_child_morning',
  personId: SEED_CHILD.id,
  timeOfDay: 'morning',
  updatedAt: 0,
  steps: [
    { id: 's1', title: 'Wake up', image: 'emoji:🌅', stars: 1 },
    { id: 's2', title: 'Go to the toilet', image: 'emoji:🚽', stars: 1 },
    { id: 's3', title: 'Get dressed', image: 'emoji:👕', stars: 1 },
    { id: 's4', title: 'Eat breakfast', image: 'emoji:🥣', stars: 1 },
    { id: 's5', title: 'Brush teeth', image: 'emoji:🪥', stars: 1 },
    { id: 's6', title: 'Brush hair', image: 'emoji:💇', stars: 1 },
    { id: 's7', title: 'Shoes on', image: 'emoji:👟', stars: 1 },
    { id: 's8', title: 'Pack school bag', image: 'emoji:🎒', stars: 1 },
  ],
};
