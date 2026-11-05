/** Short random id with a prefix, e.g. s_lx3k9a2f. Unique enough for one family's lists. */
export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
