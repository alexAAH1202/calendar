/** settings/day: today's pace for the whole family. It goes back to normal by itself the next day. */
export type DayMode = 'normal' | 'low' | 'late';

export interface DayModeDoc {
  mode: DayMode;
  /** yyyy-MM-dd the mode was set for. */
  date: string;
}

export const MODE_LABELS: Record<DayMode, string> = {
  normal: 'Normal day',
  low: 'Low-energy day',
  late: 'Running late',
};

export const MODE_ICONS: Record<DayMode, string> = { normal: '☀️', low: '🌙', late: '⏩' };

export function modeFor(doc: DayModeDoc | undefined, today: string): DayMode {
  return doc && doc.date === today ? doc.mode : 'normal';
}

/**
 * On a low-energy or running-late day only the items marked essential show.
 * If nothing in a list is marked essential, the list shows as it is (better than an empty list).
 */
export function forMode<T extends { essential?: boolean }>(items: T[], mode: DayMode): T[] {
  if (mode === 'normal') return items;
  const essential = items.filter((i) => i.essential);
  return essential.length ? essential : items;
}
