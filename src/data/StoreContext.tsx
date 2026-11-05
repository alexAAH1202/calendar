import { createContext, useContext } from 'react';
import type { FamilyStore } from './store';

export const StoreContext = createContext<FamilyStore | null>(null);

export function useStore(): FamilyStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside a StoreContext provider');
  return store;
}
