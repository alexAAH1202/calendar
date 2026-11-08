import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ConfirmButton } from '../components/ConfirmButton';
import { BridgeError, bridgeErrorText } from './bridge';
import { useCalendarData } from './CalendarContext';
import { timeLabel } from './dates';
import { blankFields, fieldsOf, toNewEvent, type EventFields } from './eventForm';
import type { CalEvent } from './types';
import { extrasKey } from '../now/upNext';

export type SheetTarget = { kind: 'new'; day: string } | { kind: 'edit'; event: CalEvent };

/** A sheet over the screen to add, change or delete one event. Parent devices only. */
export function EventSheet({ target, onClose }: { target: SheetTarget; onClose: () => void }) {
  const cal = useCalendarData();
  const writable = cal.calendars.filter((c) => c.writable);
  const original = target.kind === 'edit' ? target.event : undefined;
  const ownCal = original ? cal.calendarFor(original) : undefined;
  const canChange = !original || (!!ownCal?.writable && !original.recurring);
  const [f, setF] = useState<EventFields>(() =>
    original ? fieldsOf(original) : blankFields(writable.find((c) => c.shared)?.googleId ?? writable[0]?.googleId ?? '', target.kind === 'new' ? target.day : ''),
  );
  const [travel, setTravelMin] = useState<number | null>(original ? cal.travel[extrasKey(original)] ?? null : null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const titleRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof EventFields>(k: K, v: EventFields[K]) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setMessage(undefined);
    try {
      await action();
      onClose();
    } catch (err) {
      setMessage(bridgeErrorText(err instanceof BridgeError ? err.kind : 'network'));
      setBusy(false);
    }
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    const ev = toNewEvent(f);
    if (typeof ev === 'string') return setMessage(ev);
    void run(async () => {
      const saved = original ? await cal.update(original, ev) : await cal.create(ev);
      if (!f.allDay) cal.setTravel(saved, travel);
    });
  };

  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <form className="sheet event-form" role="dialog" aria-modal="true" aria-label={original ? 'Change event' : 'Add an event'} onSubmit={save}>
        <div className="sheet-top">
          <h3>{original ? (canChange ? 'Change event' : original.title) : 'Add an event'}</h3>
          <button type="button" className="pill" onClick={onClose}>{canChange ? 'Cancel' : 'Close'}</button>
        </div>

        {!canChange && original ? (
          <>
            <p className="panel-text">
              {timeLabel(original, original.allDay ? original.startDate! : new Date(original.start!).toISOString().slice(0, 10))}
              {ownCal ? ` · ${ownCal.label}` : ''}{original.location ? ` · ${original.location}` : ''}
            </p>
            {!original.allDay && (
              <TravelField value={travel} onChange={(m) => { setTravelMin(m); cal.setTravel(original, m); }}
                note={original.recurring ? 'Kept for every time this event repeats.' : undefined} />
            )}
            <p className="notice notice--info">
              {original.recurring
                ? bridgeErrorText('recurring')
                : 'Events on this calendar are read-only here. Tick “Parents can add events here” for it in Calendar connection to change them.'}
            </p>
          </>
        ) : writable.length === 0 ? (
          <p className="hint">To add events, tick “Parents can add events here” for a calendar in Calendar connection.</p>
        ) : (
          <>
            <label htmlFor="ev-title">What</label>
            <input id="ev-title" ref={titleRef} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="Dentist, swimming, party…" />
            <label htmlFor="ev-cal">Calendar</label>
            <select id="ev-cal" value={f.calendarId} onChange={(e) => set('calendarId', e.target.value)}>
              {writable.map((c) => <option key={c.googleId} value={c.googleId}>{c.label}</option>)}
            </select>
            <div className="event-when">
              <label className="inline-field">{f.allDay ? 'First day' : 'Date'}
                <input id="ev-date" type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />
              </label>
              <label className="check"><input id="ev-allday" type="checkbox" checked={f.allDay} onChange={(e) => set('allDay', e.target.checked)} /><span>All day</span></label>
              {f.allDay ? (
                <label className="inline-field">Last day
                  <input id="ev-last" type="date" value={f.lastDate} min={f.date} onChange={(e) => set('lastDate', e.target.value)} />
                </label>
              ) : (
                <>
                  <label className="inline-field">From<input id="ev-start" type="time" value={f.startTime} onChange={(e) => set('startTime', e.target.value)} /></label>
                  <label className="inline-field">To<input id="ev-end" type="time" value={f.endTime} onChange={(e) => set('endTime', e.target.value)} /></label>
                </>
              )}
            </div>
            <label htmlFor="ev-where">Where (optional)</label>
            <input id="ev-where" value={f.location} onChange={(e) => set('location', e.target.value)} />
            {!f.allDay && <TravelField value={travel} onChange={setTravelMin} />}
            <div className="sheet-actions">
              <button type="submit" className="btn btn--primary" disabled={busy || !f.title.trim()}>
                {busy ? 'Saving…' : original ? 'Save changes' : 'Add to calendar'}
              </button>
              {original && (
                <ConfirmButton confirmText="Tap again to delete" onConfirm={() => void run(() => cal.remove(original))}>
                  Delete event
                </ConfirmButton>
              )}
            </div>
          </>
        )}
        {message && <p className="notice" role="status">{message}</p>}
      </form>
    </div>
  );
}

/** Travel time is kept in the family's own data, not in Google, so it works on any event. */
function TravelField({ value, onChange, note }: { value: number | null; onChange: (m: number | null) => void; note?: string }) {
  return (
    <label className="inline-field">
      Travel time (the wall says when to leave)
      <select id="ev-travel" value={value === null ? 'auto' : String(value)} onChange={(e) => onChange(e.target.value === 'auto' ? null : Number(e.target.value))}>
        <option value="auto">Automatic (Google Maps, from home to this place)</option>
        <option value="0">No travel</option>
        {[5, 10, 15, 20, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} min (set by hand)</option>)}
      </select>
      {note && <span className="step-meta">{note}</span>}
    </label>
  );
}
