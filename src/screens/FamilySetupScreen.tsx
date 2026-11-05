import { useState, type FormEvent } from 'react';
import type { Family } from '../data/family';

interface Props {
  email: string;
  invite?: Family;
  onCreate: (name: string) => Promise<void>;
  onJoin: (family: Family) => Promise<void>;
  onSignOut: () => void;
}

/** First run for a parent: join the family that invited them, or start a new one. */
export function FamilySetupScreen({ email, invite, onCreate, onJoin, onSignOut }: Props) {
  const [name, setName] = useState('Our family');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch {
      setError('That did not work. Check the connection and try again.');
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) void run(() => onCreate(name.trim()));
  };

  return (
    <main className="screen gate">
      <h1>Set up your family</h1>
      <p className="gate-text">Signed in as {email}.</p>

      {invite && (
        <section className="gate-card">
          <h2>You’re invited to “{invite.name}”</h2>
          <button type="button" className="btn btn--primary btn--large" disabled={busy}
            onClick={() => void run(() => onJoin(invite))}>
            Join {invite.name}
          </button>
        </section>
      )}

      <section className="gate-card">
        <h2>{invite ? 'Or start a new family' : 'Start a new family'}</h2>
        <p className="gate-text">
          If the other parent has already started one, ask them to invite {email} from Parent mode, then reload.
        </p>
        <form className="add-step" onSubmit={submit}>
          <input id="family-name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Family name" />
          <button type="submit" className="btn btn--primary" disabled={busy || !name.trim()}>Create</button>
        </form>
      </section>

      {error && <p className="notice" role="alert">{error}</p>}
      <button type="button" className="btn" onClick={onSignOut}>Use a different account</button>
    </main>
  );
}
