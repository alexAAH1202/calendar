import { useOnline } from '../components/useOnline';

interface ListState {
  updatedElsewhere: boolean;
  saveFailing: boolean;
  writeRefused: boolean;
  retrySave: () => void;
  dismissRefused: () => void;
}

/** Calm parent-mode notes for a list: changed elsewhere, offline, not saved, refused. */
export function ListNotices({ list }: { list: ListState }) {
  const online = useOnline();
  return (
    <>
      {list.updatedElsewhere && <p className="notice notice--info" role="status">Updated on another device.</p>}
      {!online && (
        <p className="notice notice--info" role="status">Offline. Changes are saved on this device and will sync when the Wi-Fi is back.</p>
      )}
      {list.saveFailing && (
        <p className="notice" role="status">
          Not saved yet. Your changes are kept here and will save when possible.
          <button type="button" className="btn btn--small" onClick={list.retrySave}>Retry now</button>
        </p>
      )}
      {list.writeRefused && (
        <p className="notice" role="alert">
          A change was not accepted by the server.
          <button type="button" className="btn btn--small" onClick={list.dismissRefused}>OK</button>
        </p>
      )}
    </>
  );
}
