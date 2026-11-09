import { useEffect, useState } from 'react';
import type { FamilyStore } from './store';
import { personColour } from './profile';
import type { Person } from './types';

/** The family's children, in wall order. */
export function usePeople(store: FamilyStore) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(
    () =>
      store.subscribePeople((list) => {
        setPeople(list);
        setLoaded(true);
      }),
    [store],
  );

  const children = people
    .filter((p) => p.role === 'child')
    .map((p) => ({ ...p, colour: personColour(p.colour) }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));

  /** Adults on the family's timeline: people without accounts (e.g. the other parent) are listed here. */
  const adults = people
    .filter((p) => p.role === 'parent')
    .map((p) => ({ ...p, colour: personColour(p.colour) }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));

  return { children, adults, loaded };
}
