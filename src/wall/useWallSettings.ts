import { useEffect, useState } from 'react';
import type { FamilyStore } from '../data/store';

/** settings/wall: how the wall tablet behaves when nobody is using it. */
export interface WallSettings {
  sleepOn: boolean;
  /** "HH:mm" local time. */
  sleepFrom: string;
  sleepTo: string;
  nightlyReload: boolean;
}

export const DEFAULT_WALL: WallSettings = { sleepOn: true, sleepFrom: '19:30', sleepTo: '06:30', nightlyReload: true };

export function useWallSettings(store: FamilyStore) {
  const [settings, setSettings] = useState<WallSettings>(DEFAULT_WALL);
  useEffect(() => store.watchDoc<Partial<WallSettings>>(['settings', 'wall'], (d) => setSettings({ ...DEFAULT_WALL, ...d })), [store]);
  return { settings, change: (c: Partial<WallSettings>) => void store.putDoc(['settings', 'wall'], c, true) };
}
