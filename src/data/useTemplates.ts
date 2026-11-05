import { useEffect, useState } from 'react';
import type { FamilyStore } from './store';
import { BUILT_IN_TEMPLATES } from './templates';
import type { Template } from './types';

/** Built-in templates first, then the family's own, by name. */
export function useTemplates(store: FamilyStore) {
  const [own, setOwn] = useState<Template[]>([]);
  useEffect(() => store.subscribeTemplates(setOwn), [store]);
  return [...BUILT_IN_TEMPLATES, ...[...own].sort((a, b) => a.name.localeCompare(b.name))];
}
