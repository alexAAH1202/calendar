/**
 * Security rules tests. Run with: npm run test:rules
 * (starts the Firestore emulator; needs Java).
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { arrayUnion, collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

const MUM = { uid: 'mum', email: 'mum@example.com' };
const DAD = { uid: 'dad', email: 'dad@example.com' };
const STRANGER = { uid: 'eve', email: 'eve@example.com' };

const as = (u: { uid: string; email: string }) =>
  env.authenticatedContext(u.uid, { email: u.email, email_verified: true }).firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-wall-calendar',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
afterAll(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'families/f1'), {
      name: 'Home',
      members: [MUM.uid],
      parentNames: { mum: 'Mum' },
      invitedEmails: [DAD.email],
    });
    await setDoc(doc(db, 'families/f1/routines/r1'), { steps: [] });
  });
});

describe('family document', () => {
  it('a member can read and find their family', async () => {
    await assertSucceeds(getDoc(doc(as(MUM), 'families/f1')));
    await assertSucceeds(getDocs(query(collection(as(MUM), 'families'), where('members', 'array-contains', MUM.uid))));
  });

  it('an invited parent can find the family by email', async () => {
    await assertSucceeds(
      getDocs(query(collection(as(DAD), 'families'), where('invitedEmails', 'array-contains', DAD.email))),
    );
  });

  it('a stranger and a signed-out device cannot read it', async () => {
    await assertFails(getDoc(doc(as(STRANGER), 'families/f1')));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'families/f1')));
    await assertFails(getDocs(collection(as(STRANGER), 'families')));
  });

  it('anyone signed in can create a family with only themselves in it', async () => {
    const base = { name: 'Eve', invitedEmails: [], parentNames: { eve: 'Eve' } };
    await assertSucceeds(setDoc(doc(as(STRANGER), 'families/f2'), { ...base, members: [STRANGER.uid] }));
    await assertFails(setDoc(doc(as(STRANGER), 'families/f3'), { ...base, members: [STRANGER.uid, MUM.uid] }));
  });

  it('an invited parent can add only themselves', async () => {
    await assertFails(updateDoc(doc(as(DAD), 'families/f1'), { members: arrayUnion(DAD.uid, STRANGER.uid) }));
    await assertFails(updateDoc(doc(as(DAD), 'families/f1'), { members: arrayUnion(DAD.uid), name: 'Mine' }));
    await assertSucceeds(
      updateDoc(doc(as(DAD), 'families/f1'), { members: arrayUnion(DAD.uid), 'parentNames.dad': 'Dad' }),
    );
    await assertSucceeds(getDoc(doc(as(DAD), 'families/f1/routines/r1')));
  });

  it('a stranger cannot join or invite themselves', async () => {
    await assertFails(updateDoc(doc(as(STRANGER), 'families/f1'), { members: arrayUnion(STRANGER.uid) }));
    await assertFails(updateDoc(doc(as(STRANGER), 'families/f1'), { invitedEmails: arrayUnion(STRANGER.email) }));
  });

  it('an unverified email cannot use an invite', async () => {
    const unverified = env.authenticatedContext(DAD.uid, { email: DAD.email, email_verified: false }).firestore();
    await assertFails(updateDoc(doc(unverified, 'families/f1'), { members: arrayUnion(DAD.uid) }));
  });

  it('nobody can delete the family, not even a member', async () => {
    const { deleteDoc } = await import('firebase/firestore');
    await assertFails(deleteDoc(doc(as(MUM), 'families/f1')));
  });
});

describe('family contents', () => {
  it('members can read and write routines and days', async () => {
    await assertSucceeds(setDoc(doc(as(MUM), 'families/f1/routines/r1'), { steps: [{ id: 's1' }] }));
    await assertSucceeds(setDoc(doc(as(MUM), 'families/f1/days/2026-11-05_p1'), { doneStepIds: ['s1'] }));
  });

  it('invited but not yet joined, strangers and signed-out devices cannot', async () => {
    await assertFails(getDoc(doc(as(DAD), 'families/f1/routines/r1')));
    await assertFails(getDoc(doc(as(STRANGER), 'families/f1/routines/r1')));
    await assertFails(setDoc(doc(as(STRANGER), 'families/f1/routines/r1'), { steps: [] }));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'families/f1/routines/r1')));
  });
});
