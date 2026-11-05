import {
  GoogleAuthProvider,
  signInWithCredential,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { useEffect, useState } from 'react';

export type AuthState = { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; user: User };

/** Firebase keeps the sign-in on the device, so the tablet stays signed in across reloads. */
export function useAuth(auth: Auth) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [error, setError] = useState<string>();

  useEffect(() => {
    // Test builds only: lets browser tests sign in as a fake Google account on the Auth emulator.
    if (import.meta.env.VITE_USE_EMULATORS === '1') {
      (window as unknown as Record<string, unknown>).__signInAs = (email: string, name: string) =>
        signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, name, email_verified: true })));
    }
  }, [auth]);

  useEffect(
    () => onAuthStateChanged(auth, (user) => setState(user ? { status: 'signedIn', user } : { status: 'signedOut' })),
    [auth],
  );

  const signIn = async () => {
    setError(undefined);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, provider);
      } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError('Sign-in did not work. Check the connection and try again.');
      }
    }
  };

  return { state, error, signIn, signOut: () => signOut(auth) };
}
