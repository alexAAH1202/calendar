import { useEffect, useState } from 'react';
import type { FamilyStore } from './store';

/** Watches several documents at once (e.g. every child's chores); keyed by path joined with "/". */
export function useDocs<T>(store: FamilyStore, paths: string[][]) {
  const key = paths.map((p) => p.join('/')).join('|');
  const [docs, setDocs] = useState<Record<string, T | undefined>>({});
  const [seen, setSeen] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDocs({});
    setSeen(new Set());
    const offs = paths.map((path) => {
      const k = path.join('/');
      return store.watchDoc<T>(path, (data) => {
        setDocs((d) => ({ ...d, [k]: data }));
        setSeen((s) => (s.has(k) ? s : new Set(s).add(k)));
      });
    });
    return () => offs.forEach((off) => off());
  }, [store, key]); // key stands for paths

  return { docs, loaded: paths.every((p) => seen.has(p.join('/'))) };
}
