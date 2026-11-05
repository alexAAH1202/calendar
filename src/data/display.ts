import type { CompletedBehaviour, Step } from './types';

/**
 * The order a child sees. Purely a display rule: the stored order is never changed.
 * 'stay' keeps done steps in place, 'moveToBottom' moves them after the rest
 * (keeping their relative order), 'hide' leaves them out.
 */
export function displaySteps(steps: Step[], done: Set<string>, behaviour: CompletedBehaviour): Step[] {
  if (behaviour === 'stay') return steps;
  const open = steps.filter((s) => !done.has(s.id));
  if (behaviour === 'hide') return open;
  return [...open, ...steps.filter((s) => done.has(s.id))];
}
