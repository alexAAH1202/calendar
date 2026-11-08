import { useEffect, useState } from 'react';
import type { FamilyStore } from '../data/store';

/** A small settings document (settings/{name}) with defaults for anything not yet saved. */
export function useSettingsDoc<T extends object>(store: FamilyStore, name: string, defaults: T) {
  const [value, setValue] = useState<T>(defaults);
  useEffect(() => store.watchDoc<Partial<T>>(['settings', name], (d) => setValue({ ...defaults, ...d })), [store, name]); // defaults are constants
  return { value, change: (c: Partial<T>) => void store.putDoc(['settings', name], c, true) };
}
