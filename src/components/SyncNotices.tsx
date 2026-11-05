import type { RoutineSet } from '../data/useRoutineSet';
import { useEffect, useState } from 'react';
import { useOnline } from './useOnline';

/** True once `value` has stayed true for `ms`, so quick syncs never flash a message. */
function useSustained(value: boolean, ms: number): boolean {
  const [sustained, setSustained] = useState(false);
  useEffect(() => {
    if (!value) return setSustained(false);
    const t = window.setTimeout(() => setSustained(true), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return sustained;
}

/** Calm, parent-mode-only messages about saving and syncing. Never shown on the child view. */
export function SyncNotices({ routine }: { routine: RoutineSet }) {
  const online = useOnline();
  const slowSync = useSustained(routine.pendingSync, 2000);
  return (
    <>
      {routine.updatedElsewhere && (
        <p className="notice notice--info" role="status">Updated on another device.</p>
      )}
      {!online && (
        <p className="notice notice--info" role="status">
          Offline. Changes are saved on this device and will sync when the Wi-Fi is back.
        </p>
      )}
      {online && slowSync && (
        <p className="notice notice--info" role="status">Syncing with the other devices…</p>
      )}
      {routine.saveFailing && (
        <p className="notice" role="status">
          Not saved yet. Your changes are kept here and will save when possible.
          <button type="button" className="btn btn--small" onClick={routine.retrySave}>Retry now</button>
        </p>
      )}
      {routine.writeRefused && (
        <p className="notice" role="alert">
          A change was not accepted by the server. This account may not be in the family.
          <button type="button" className="btn btn--small" onClick={routine.dismissRefused}>OK</button>
        </p>
      )}
    </>
  );
}
