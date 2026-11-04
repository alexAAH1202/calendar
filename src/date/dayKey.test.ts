import { describe, expect, it } from 'vitest';
import { dayDocId, dayKey } from './dayKey';

describe('dayKey', () => {
  it('uses the local date, not UTC', () => {
    expect(dayKey(new Date(2026, 10, 5, 23, 59, 59))).toBe('2026-11-05');
    expect(dayKey(new Date(2026, 10, 6, 0, 0, 0))).toBe('2026-11-06');
  });
  it('changes exactly at local midnight', () => {
    const before = new Date(2026, 11, 31, 23, 59, 59, 999);
    const after = new Date(before.getTime() + 1);
    expect(dayKey(before)).toBe('2026-12-31');
    expect(dayKey(after)).toBe('2027-01-01');
  });
  it('builds the per-person day id', () => {
    expect(dayDocId('2026-11-05', 'p_ava')).toBe('2026-11-05_p_ava');
  });
});
