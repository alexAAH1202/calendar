/** "HH:mm" to minutes after midnight. */
export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** True during the sleep window. The window may cross midnight (19:30 to 06:30). Equal times mean never. */
export function inSleepWindow(now: Date, from: string, to: string): boolean {
  const n = now.getHours() * 60 + now.getMinutes();
  const a = toMinutes(from);
  const b = toMinutes(to);
  if (a === b) return false;
  return a < b ? n >= a && n < b : n >= a || n < b;
}

export interface ReloadCheck {
  now: Date;
  /** yyyy-MM-dd of the last automatic reload on this device. */
  lastReloadDay?: string;
  today: string;
  /** Milliseconds since anyone touched the screen. */
  idleMs: number;
  /** Changes made here not yet on the server. */
  pendingWrites: boolean;
}

/** The nightly reload: once a day, 3:00–4:59 am, only after 5 quiet minutes and with nothing waiting to sync. */
export function shouldReload(c: ReloadCheck): boolean {
  const h = c.now.getHours();
  return h >= 3 && h < 5 && c.lastReloadDay !== c.today && c.idleMs >= 5 * 60_000 && !c.pendingWrites;
}

