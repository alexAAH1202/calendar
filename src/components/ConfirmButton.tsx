import { useEffect, useState, type ReactNode } from 'react';

/** A button that needs a second tap within 4 s, for deletes. No pop-up dialogs. */
export function ConfirmButton({ children, confirmText, onConfirm, className = 'btn btn--danger' }: {
  children: ReactNode;
  confirmText: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(t);
  }, [armed]);
  return (
    <button type="button" className={className} onClick={() => (armed ? onConfirm() : setArmed(true))}>
      {armed ? confirmText : children}
    </button>
  );
}
