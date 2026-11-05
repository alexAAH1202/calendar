import type { TimeOfDay } from './types';

export const TIME_LABELS: Record<TimeOfDay, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
};

/** Hours (local) at which the afternoon and evening routines take over. */
export const DEFAULT_BOUNDS = { afternoon: 12, evening: 17 };

export function timeOfDayAt(date: Date, bounds = DEFAULT_BOUNDS): TimeOfDay {
  const h = date.getHours();
  if (h < bounds.afternoon) return 'morning';
  if (h < bounds.evening) return 'afternoon';
  return 'evening';
}

/** Routine document id for a person and time of day: p_ava + morning -> r_ava_morning. */
export function routineId(personId: string, tod: TimeOfDay): string {
  return `r_${personId.replace(/^p_/, '')}_${tod}`;
}
