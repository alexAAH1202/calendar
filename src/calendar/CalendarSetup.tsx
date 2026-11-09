import { WhoRules } from './WhoRules';
import { useEffect, useState, type FormEvent } from 'react';
import { useStore } from '../data/StoreContext';
import { BridgeError, bridgeErrorText, createBridge, validBridgeUrl } from './bridge';
import { useCalendarData } from './CalendarContext';
import type { BridgeCalendar, FamilyCalendar } from './types';
import { WhoChips } from './WhoChips';

/** Firestore-safe document id for a Google calendar id. */
export const calendarDocId = (googleId: string) => googleId.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 120);

/** Connect the Apps Script bridge, then choose which Google calendars the wall shows. */
export function CalendarSetup() {
  const store = useStore();
  const cal = useCalendarData();
  const [url, setUrl] = useState(cal.settings?.url ?? '');
  const [key, setKey] = useState(cal.settings?.key ?? '');
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const [google, setGoogle] = useState<BridgeCalendar[]>();

  useEffect(() => {
    if (!cal.bridge) return;
    cal.bridge.calendars().then(setGoogle).catch(() => setGoogle(undefined));
  }, [cal.bridge]);

  const connect = async (e: FormEvent) => {
    e.preventDefault();
    if (!validBridgeUrl(url)) {
      setMessage('The address should look like https://script.google.com/macros/s/…/exec');
      return;
    }
    setBusy(true);
    setMessage(undefined);
    try {
      const list = await createBridge({ url: url.trim(), key: key.trim() }).calendars();
      await store.putDoc(['settings', 'calendarBridge'], { url: url.trim(), key: key.trim() });
      setGoogle(list);
      setMessage(`Connected. ${list.length} calendars found. Choose which ones the wall shows.`);
    } catch (err) {
      setMessage(bridgeErrorText(err instanceof BridgeError ? err.kind : 'network'));
    } finally {
      setBusy(false);
    }
  };

  const chosen = new Map(cal.calendars.map((c) => [c.googleId, c]));
  const save = (c: FamilyCalendar) => void store.putDoc(['calendars', c.id], strip(c));
  const toggle = (g: BridgeCalendar, on: boolean) => {
    if (!on) return void store.removeDoc(['calendars', calendarDocId(g.id)]);
    if (cal.calendars.length >= 10) return setMessage('The wall can show up to 10 calendars.');
    save({
      id: calendarDocId(g.id),
      googleId: g.id,
      label: g.primary ? 'Me' : g.name,
      colour: g.colour,
      writable: g.owned,
      shared: false,
      order: cal.calendars.length,
      defaultWho: [],
    });
  };

  return (
    <section className="panel" aria-label="Calendar connection">
      <h3>Calendar connection</h3>
      <p className="panel-text">
        The wall reads and adds events through a small Apps Script in your Google account. See
        <code> apps-script/README.md </code> in the project for the five-minute setup.
      </p>
      <form className="setup-form" onSubmit={connect}>
        <label htmlFor="bridge-url">Web app address</label>
        <input id="bridge-url" value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url"
          placeholder="https://script.google.com/macros/s/…/exec" autoComplete="off" />
        <label htmlFor="bridge-key">Key (from setup() in Apps Script)</label>
        <div className="add-step">
          <input id="bridge-key" type={showKey ? 'text' : 'password'} value={key} onChange={(e) => setKey(e.target.value)}
            autoComplete="off" />
          <button type="button" className="btn" onClick={() => setShowKey((s) => !s)}>{showKey ? 'Hide' : 'Show'}</button>
        </div>
        <button type="submit" className="btn btn--primary" disabled={busy || !url.trim() || !key.trim()}>
          {busy ? 'Connecting…' : cal.settings ? 'Reconnect' : 'Connect'}
        </button>
      </form>
      {message && <p role="status">{message}</p>}

      {google && (
        <ul className="cal-choices">
          {google.map((g) => {
            const c = chosen.get(g.id);
            return (
              <li key={g.id} className="cal-choice" style={{ borderLeftColor: g.colour }}>
                <label className="check">
                  <input type="checkbox" checked={!!c} onChange={(e) => toggle(g, e.target.checked)} />
                  <span>{g.name}{g.primary ? ' (your main calendar)' : ''}</span>
                </label>
                {c && (
                  <div className="cal-options">
                    <label className="inline-field">
                      Name on the wall
                      <input value={c.label} onChange={(e) => save({ ...c, label: e.target.value.slice(0, 30) })}
                        aria-label={`Name on the wall for ${g.name}`} />
                    </label>
                    <WhoChips people={cal.lanePeople} value={c.defaultWho ?? []} label="Whose calendar is this? (its events go in their row unless you change one)"
                      onChange={(ids) => save({ ...c, defaultWho: ids })} />
                    <label className="check">
                      <input type="checkbox" checked={c.shared} onChange={(e) => save({ ...c, shared: e.target.checked })} />
                      <span>Shared family calendar (show who added events)</span>
                    </label>
                    <label className="check">
                      <input type="checkbox" checked={c.writable} onChange={(e) => save({ ...c, writable: e.target.checked })} />
                      <span>Parents can add events here{g.owned ? '' : ' (needs “Make changes” sharing in Google)'}</span>
                    </label>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="panel-text">
        Anyone with the key can read and add events on these calendars. It is stored only in your family’s data,
        which only the two parents’ accounts can read. To change it, run resetKey() in Apps Script and reconnect.
      </p>
      <WhoRules />
    </section>
  );
}

function strip(c: FamilyCalendar): Omit<FamilyCalendar, 'id'> {
  const { id: _id, ...rest } = c;
  return rest;
}
