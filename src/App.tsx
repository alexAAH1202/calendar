import { useMemo, type ReactNode } from 'react';
import { useAuth } from './auth/useAuth';
import { parentOf, useFamily } from './auth/useFamily';
import { FamilyPanel } from './components/FamilyPanel';
import { firebaseConfig } from './data/config';
import { inviteParent } from './data/family';
import { startFirebase, type FirebaseHandles } from './data/firebase';
import { createFirestoreStore } from './data/firestoreStore';
import { createLocalStore } from './data/localStore';
import { SEED_CHILD, SEED_ROUTINE } from './data/seed';
import { StoreContext } from './data/StoreContext';
import type { FamilyStore } from './data/store';
import { FamilySetupScreen } from './screens/FamilySetupScreen';
import { RoutineScreen } from './screens/RoutineScreen';
import { SignInScreen } from './screens/SignInScreen';

/** Phones open straight into edit mode; the wall tablet opens in child mode. */
const isPhone = window.matchMedia('(max-width: 899px)').matches;

export function App() {
  const config = firebaseConfig();
  return config ? <CloudApp handles={startFirebase(config)} /> : <LocalApp />;
}

/** No Firebase config: everything stays on this device (Phase 1 behaviour, and the demo page). */
function LocalApp() {
  const store = useMemo(() => createLocalStore(), []);
  return <Routine store={store} />;
}

function Routine({ store, parentTools }: { store: FamilyStore; parentTools?: ReactNode }) {
  return (
    <StoreContext.Provider value={store}>
      <RoutineScreen person={SEED_CHILD} seed={SEED_ROUTINE} isPhone={isPhone} parentTools={parentTools} />
    </StoreContext.Provider>
  );
}

function Splash({ text }: { text: string }) {
  return <main className="screen gate"><p className="gate-text">{text}</p></main>;
}

function CloudApp({ handles }: { handles: FirebaseHandles }) {
  const auth = useAuth(handles.auth);
  if (auth.state.status === 'loading') return <Splash text="Loading…" />;
  if (auth.state.status === 'signedOut') return <SignInScreen onSignIn={auth.signIn} error={auth.error} />;
  return <FamilyGate key={auth.state.user.uid} handles={handles} user={auth.state.user} onSignOut={auth.signOut} />;
}

function FamilyGate({ handles, user, onSignOut }: {
  handles: FirebaseHandles;
  user: Parameters<typeof parentOf>[0];
  onSignOut: () => void;
}) {
  const { state, create, join, retry } = useFamily(handles.db, user);
  const familyId = state.status === 'ready' ? state.family.id : undefined;
  const store = useMemo(() => (familyId ? createFirestoreStore(handles.db, familyId) : undefined), [handles.db, familyId]);

  if (state.status === 'loading') return <Splash text="Finding your family…" />;
  if (state.status === 'error') {
    return (
      <main className="screen gate">
        <p className="notice" role="alert">{state.message}</p>
        <button type="button" className="btn btn--primary" onClick={retry}>Try again</button>
        <button type="button" className="btn" onClick={onSignOut}>Sign out</button>
      </main>
    );
  }
  if (state.status === 'none' || !store) {
    return (
      <FamilySetupScreen email={user.email ?? ''} invite={state.status === 'none' ? state.invite : undefined}
        onCreate={create} onJoin={join} onSignOut={onSignOut} />
    );
  }
  return (
    <Routine
      store={store}
      parentTools={
        <FamilyPanel family={state.family} signedInAs={user.email ?? ''}
          onInvite={(email) => inviteParent(handles.db, state.family.id, email)} onSignOut={onSignOut} />
      }
    />
  );
}
