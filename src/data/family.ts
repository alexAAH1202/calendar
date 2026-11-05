import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { SEED_CHILD, SEED_ROUTINE } from './seed';

/** The family document: families/{fid}. */
export interface Family {
  id: string;
  name: string;
  /** Parent uids. Only members can read or write anything in the family. */
  members: string[];
  /** Display names of members, by uid. */
  parentNames: Record<string, string>;
  /** Google account emails invited to join as the second parent. */
  invitedEmails: string[];
}

export interface Parent {
  uid: string;
  email: string;
  name: string;
}

/** The family this parent belongs to, or undefined. */
export async function findFamily(db: Firestore, uid: string): Promise<Family | undefined> {
  const snap = await getDocs(query(collection(db, 'families'), where('members', 'array-contains', uid), limit(1)));
  const d = snap.docs[0];
  return d ? ({ id: d.id, ...d.data() } as Family) : undefined;
}

/** A family that has invited this email address, or undefined. */
export async function findInvite(db: Firestore, email: string): Promise<Family | undefined> {
  const snap = await getDocs(
    query(collection(db, 'families'), where('invitedEmails', 'array-contains', email.toLowerCase()), limit(1)),
  );
  const d = snap.docs[0];
  return d ? ({ id: d.id, ...d.data() } as Family) : undefined;
}

/** Creates the family with this parent as its first member, then adds the starter child and routine. */
export async function createFamily(db: Firestore, parent: Parent, name: string): Promise<string> {
  const ref = doc(collection(db, 'families'));
  await setDoc(ref, {
    name,
    members: [parent.uid],
    parentNames: { [parent.uid]: parent.name },
    invitedEmails: [],
    createdAt: Date.now(),
  });
  // A second write: the rules check membership against the family document, which must exist first.
  const batch = writeBatch(db);
  const { id: pid, ...person } = SEED_CHILD;
  batch.set(doc(ref, 'people', pid), person);
  const { id: rid, ...routine } = SEED_ROUTINE;
  batch.set(doc(ref, 'routines', rid), { ...routine, updatedAt: Date.now() });
  await batch.commit();
  return ref.id;
}

export async function inviteParent(db: Firestore, familyId: string, email: string): Promise<void> {
  await updateDoc(doc(db, 'families', familyId), { invitedEmails: arrayUnion(email.trim().toLowerCase()) });
}

/** Joins a family that invited this parent's email. The rules allow adding only yourself. */
export async function joinFamily(db: Firestore, familyId: string, parent: Parent): Promise<void> {
  await updateDoc(doc(db, 'families', familyId), {
    members: arrayUnion(parent.uid),
    [`parentNames.${parent.uid}`]: parent.name,
  });
}
