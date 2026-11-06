import { createContext, useContext } from 'react';

export interface ParentInfo {
  id: string;
  name: string;
}

/** The parents in the family and which one is signed in on this device. */
export interface FamilyInfo {
  parents: ParentInfo[];
  me: ParentInfo;
}

/** Parents' colour on chore columns and the Day list (one of the tested person colours). */
export const PARENT_COLOUR = '#7b5cc4';

/** Without Firebase there is one, unnamed parent on this device. */
export const LOCAL_FAMILY: FamilyInfo = { parents: [{ id: 'parent', name: 'Parent' }], me: { id: 'parent', name: 'Parent' } };

export const FamilyInfoContext = createContext<FamilyInfo>(LOCAL_FAMILY);
export const useFamilyInfo = () => useContext(FamilyInfoContext);
