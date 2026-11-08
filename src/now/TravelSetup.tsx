import { useEffect, useState } from 'react';
import { BridgeError, bridgeErrorText } from '../calendar/bridge';
import { useCalendarData } from '../calendar/CalendarContext';
import { Tabs } from '../components/Tabs';
import { useStore } from '../data/StoreContext';
import { DEFAULT_TRAVEL, type TravelSettings } from './travel';
import { useSettingsDoc } from './useSettingsDoc';

/** Parent → Calendar: home address and buffer for leave-by times from Google Maps. */
export function TravelSetup() {
  const cal = useCalendarData();
  const { value: s, change } = useSettingsDoc<TravelSettings>(useStore(), 'travel', DEFAULT_TRAVEL);
  const [home, setHome] = useState(s.home);
  const [to, setTo] = useState('');
  const [result, setResult] = useState<string>();
  const [busy, setBusy] = useState(false);
  useEffect(() => setHome(s.home), [s.home]);

  const test = async () => {
    if (!cal.bridge) return setResult('Connect the calendar above first: the same Apps Script asks Google Maps.');
    setBusy(true);
    setResult('Asking Google Maps…');
    try {
      const t = await cal.bridge.travel(home.trim(), to.trim(), Date.now() + 30 * 60_000);
      setResult(`${t.minutes} min drive${t.traffic ? ' in expected traffic' : ''} (${t.distance}) to ${t.to}. With the buffer: leave ${t.minutes + s.buffer} min before.`);
    } catch (e) {
      setResult(bridgeErrorText(e instanceof BridgeError ? e.kind : 'network'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel" aria-label="Leave-by times from Google Maps">
      <h3>Leave-by times from Google Maps</h3>
      <p className="panel-text">
        For events with a place, the wall asks Google Maps how long the drive from home takes at that time of day and says when to
        leave. A travel time set by hand on an event always wins. The home address is kept in your family’s data and sent only to
        your own Apps Script, which asks Google Maps.
      </p>
      <Tabs<string> label="Leave-by times" value={s.on ? 'on' : 'off'} onChange={(v) => change({ on: v === 'on' })}
        options={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]} />
      <label htmlFor="travel-home" className="field-label">Home address</label>
      <div className="add-step">
        <input id="travel-home" value={home} onChange={(e) => setHome(e.target.value)} placeholder="1 Example St, Suburb VIC" autoComplete="street-address"
          onBlur={() => home.trim() !== s.home && change({ home: home.trim() })} />
        <button type="button" className="btn" disabled={home.trim() === s.home} onClick={() => change({ home: home.trim() })}>Save</button>
      </div>
      <label className="inline-field">
        Buffer (parking, shoes, getting out the door)
        <select id="travel-buffer" value={String(s.buffer)} onChange={(e) => change({ buffer: Number(e.target.value) })}>
          {[0, 5, 10, 15].map((m) => <option key={m} value={m}>{m ? `${m} min` : 'None'}</option>)}
        </select>
      </label>
      <span className="field-label">Try it</span>
      <div className="add-step">
        <input id="travel-test" value={to} onChange={(e) => setTo(e.target.value)} placeholder="A place, e.g. the aerials studio’s address" />
        <button type="button" className="btn" disabled={busy || !home.trim() || !to.trim()} onClick={() => void test()}>Test</button>
      </div>
      {result && <p className="notice notice--info" role="status">{result}</p>}
      <p className="panel-text">Give events a precise place in Google Calendar (an address, or the venue’s name as Maps knows it): “Melton” alone goes to the middle of the suburb.</p>
    </section>
  );
}
