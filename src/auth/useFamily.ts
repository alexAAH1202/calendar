import type { User } from 'firebase/auth';
import { doc, onSnapshot, type Firestore } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { createFamily, findFamily, findInvite, joinFamily, type Family, type Parent } from '../data/family';

export type FamilyState =
  | { status: 'loading' }
  | { status: 'none'; invite?: Family }
  | { status: 'ready'; family: Family }
  | { status: 'error'; message: string };

export const parentOf = (user: User): Parent => ({
  uid: user.uid,
  email: (user.email ?? '').toLowerCase(),
  name: user.displayName?.split(' ')[0] ?? user.email ?? 'Parent',
});

/** Finds this parent's family (or an invite to one) and keeps it live. */
export function useFamily(db: Firestore, user: User) {
  const [state, setState] = useState<FamilyState>({ status: 'loading' });
  const [familyId, setFamilyId] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const parent = parentOf(user);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    (async () => {
      const found = await findFamily(db, user.uid);
      if (cancelled) return;
      if (found) return setFamilyId(found.id);
      const invite = parent.email ? await findInvite(db, parent.email) : undefined;
      if (!cancelled) setState({ status: 'none', invite });
    })().catch(() => !cancelled && setState({ status: 'error', message: 'Could not reach the family data.' }));
    return () => {
      cancelled = true;
    };
  }, [db, user.uid, attempt]);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(
      doc(db, 'families', familyId),
      (snap) => snap.exists() && setState({ status: 'ready', family: { id: snap.id, ...snap.data() } as Family }),
      () => setState({ status: 'error', message: 'This account is not in the family any more.' }),
    );
  }, [db, familyId]);

  const create = useCallback(
    async (name: string) => setFamilyId(await createFamily(db, parent, name)),
    [db, user.uid],
  );
  const join = useCallback(
    async (family: Family) => {
      await joinFamily(db, family.id, parent);
      setFamilyId(family.id);
    },
    [db, user.uid],
  );

  return { state, create, join, retry: () => setAttempt((a) => a + 1) };
}
