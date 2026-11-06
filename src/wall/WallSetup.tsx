import { useStore } from '../data/StoreContext';
import { Tabs } from '../components/Tabs';
import { reloadApp } from './pwa';
import { useUpdateReady } from './useUpdateReady';
import { useWallSettings } from './useWallSettings';

/** Parent → Wall: sleep times, nightly reload, installing, updates. */
export function WallSetup({ wakeLockHeld }: { wakeLockHeld?: boolean }) {
  const { settings, change } = useWallSettings(useStore());
  const updateReady = useUpdateReady();
  return (
    <section className="panel" aria-label="Wall tablet">
      <h3>Wall tablet</h3>
      <div className="field">
        <span className="field-label">Sleep screen (black with a small clock; a touch wakes it)</span>
        <Tabs<string> label="Sleep screen" value={settings.sleepOn ? 'on' : 'off'} onChange={(v) => change({ sleepOn: v === 'on' })}
          options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]} />
        {settings.sleepOn && (
          <div className="event-when">
            <label className="inline-field">From<input id="sleep-from" type="time" value={settings.sleepFrom} onChange={(e) => e.target.value && change({ sleepFrom: e.target.value })} /></label>
            <label className="inline-field">Until<input id="sleep-to" type="time" value={settings.sleepTo} onChange={(e) => e.target.value && change({ sleepTo: e.target.value })} /></label>
          </div>
        )}
      </div>
      <div className="field">
        <span className="field-label">Reload once a night (about 3 am, only when nobody is using it) to pick up updates</span>
        <Tabs<string> label="Nightly reload" value={settings.nightlyReload ? 'on' : 'off'} onChange={(v) => change({ nightlyReload: v === 'on' })}
          options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]} />
      </div>
      <p className="panel-text">
        Keep screen on: {wakeLockHeld === undefined ? 'only on the wall tablet.' : wakeLockHeld ? 'yes, this screen stays on while the app is open.' : 'not available right now (the tablet may be in battery saver).'}
      </p>
      <p className="panel-text">
        Install: in Chrome on the tablet, ⋮ → Add to home screen (or Install app), then open it from the home screen.
        It then runs full screen and opens without Wi-Fi. To stop a child leaving it, turn on Android’s app pinning.
      </p>
      {updateReady ? (
        <button type="button" className="btn btn--primary" onClick={() => void reloadApp()}>A new version is ready: load it now</button>
      ) : (
        <p className="panel-text">This is the latest version.</p>
      )}
    </section>
  );
}
