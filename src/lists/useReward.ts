import { useEffect, useState } from 'react';
import type { FamilyStore } from '../data/store';
import { DEFAULT_REWARD, type Reward } from './stars';

/** A child's star bank and reward (rewards/{personId}). */
export function useReward(store: FamilyStore, personId: string) {
  const [reward, setReward] = useState<Reward>(DEFAULT_REWARD);
  useEffect(
    () => store.watchDoc<Partial<Reward>>(['rewards', personId], (d) => setReward({ ...DEFAULT_REWARD, ...d })),
    [store, personId],
  );
  return {
    reward,
    /** Changes the target or label; the bank itself only moves by adding stars. */
    change: (c: Partial<Pick<Reward, 'target' | 'label'>>) => void store.putDoc(['rewards', personId], c, true),
    /** The reward was given: its stars come off the bank (any extra stay). */
    given: () => void store.addStars(personId, -reward.target),
  };
}
