import { useState, type FormEvent } from 'react';
import type { Family } from '../data/family';

interface Props {
  family: Family;
  signedInAs: string;
  onInvite: (email: string) => Promise<void>;
  onSignOut: () => void;
}

/** Parent-mode panel: who is in the family, invite the other parent, sign out. */
export function FamilyPanel({ family, signedInAs, onInvite, onSignOut }: Props) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string>();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    try {
      await onInvite(email);
      setMessage(`Invited ${email.trim().toLowerCase()}. They sign in on their phone and tap Join.`);
      setEmail('');
    } catch {
      setMessage('Could not send the invite. Check the connection and try again.');
    }
  };

  const names = family.members.map((uid) => family.parentNames[uid] ?? 'Parent').join(' and ');
  const waiting = family.invitedEmails.filter(Boolean);

  return (
    <section className="family-panel" aria-label="Family">
      <p><strong>{family.name}</strong>: {names}. Signed in as {signedInAs}.</p>
      {family.members.length < 2 && (
        <form className="add-step" onSubmit={submit}>
          <input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Other parent’s Google email" aria-label="Other parent’s Google email" />
          <button type="submit" className="btn btn--primary" disabled={!valid}>Invite</button>
        </form>
      )}
      {family.members.length < 2 && waiting.length > 0 && <p>Invited: {waiting.join(', ')}</p>}
      {message && <p role="status">{message}</p>}
      <button type="button" className="btn" onClick={onSignOut}>Sign out of this device</button>
    </section>
  );
}
