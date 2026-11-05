export function SignInScreen({ onSignIn, error }: { onSignIn: () => void; error?: string }) {
  return (
    <main className="screen gate">
      <h1>Family Wall Calendar</h1>
      <p className="gate-text">Sign in with a parent’s Google account. The tablet stays signed in after this.</p>
      <button type="button" className="btn btn--primary btn--large" onClick={onSignIn}>
        Sign in with Google
      </button>
      {error && <p className="notice" role="alert">{error}</p>}
    </main>
  );
}
