import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';

export interface FirebaseHandles {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let handles: FirebaseHandles | undefined;

/** Starts Firebase once, with Firestore's offline cache kept on the device. */
export function startFirebase(config: FirebaseOptions): FirebaseHandles {
  if (handles) return handles;
  const app = initializeApp(config);
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  const auth = getAuth(app);
  // Test builds only (VITE_USE_EMULATORS=1): talk to the local Firebase emulators.
  if (import.meta.env.VITE_USE_EMULATORS === '1') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  handles = { app, auth, db };
  return handles;
}
