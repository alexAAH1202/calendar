import { addDays, addHours, format, startOfHour } from 'date-fns';
import { useState, type FormEvent } from 'react';
import { BridgeError, bridgeErrorText } from './bridge';
import { useCalendarData } from './CalendarContext';
import type { NewEvent } from './types';

/** Turns the form's local date and times into the bridge's event shape. */
export function toNewEvent(f: {
  calendarId: string; title: string; location: string; date: string; allDay: boolean; startTime: string; endTime: string;
}): NewEvent | string {
  const title = f.title.trim();
  if (!title) return 'Give the event a name.';
  if (!f.date) return 'Choose a date.';
  if (f.allDay) {
    return { calendarId: f.calendarId, title, location: f.location.trim(), allDay: true,
      startDate: f.date, endDate: format(addDays(new Date(`${f.date}T12:00:00`), 1), 'yyyy-MM-dd') };
  }
  const start = new Date(`${f.date}T${f.startTime}`).getTime();
  let end = new Date(`${f.date}T${f.endTime}`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 'Choose a start and end time.';
  if (end <= start) end = addDays(new Date(end), 1).getTime(); // ends after midnight
  return { calendarId: f.calendarId, title, location: f.location.trim(), allDay: false, start, end };
}

/** Parent mode: add an event to a writable calendar. */
export function AddEventForm() {
  const cal = useCalendarData();
  const writable = cal.calendars.filter((c) => c.writable);
  const next = startOfHour(addHours(new Date(), 1));
  const [calendarId, setCalendarId] = useState(writable.find((c) => c.shared)?.googleId ?? writable[0]?.googleId ?? '');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(format(next, 'yyyy-MM-dd'));
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState(format(next, 'HH:mm'));
  const [endTime, setEndTime] = useState(format(addHours(next, 1), 'HH:mm'));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  if (writable.length === 0) {
    return <p className="hint">To add events, tick “Parents can add events here” for a calendar below.</p>;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ev = toNewEvent({ calendarId, title, location, date, allDay, startTime, endTime });
    if (typeof ev === 'string') return setMessage(ev);
    setBusy(true);
    setMessage(undefined);
    try {
      await cal.create(ev);
      const label = writable.find((c) => c.googleId === calendarId)?.label ?? 'the calendar';
      setMessage(`Added “${ev.title}” to ${label}.`);
      setTitle('');
      setLocation('');
    } catch (err) {
      setMessage(bridgeErrorText(err instanceof BridgeError ? err.kind : 'network'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel event-form" onSubmit={submit} aria-label="Add an event">
      <h3>Add an event</h3>
      <label htmlFor="ev-title">What</label>
      <input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dentist, swimming, party…" />
      <label htmlFor="ev-cal">Calendar</label>
      <select id="ev-cal" value={calendarId} onChange={(e) => setCalendarId(e.target.value)}>
        {writable.map((c) => <option key={c.googleId} value={c.googleId}>{c.label}</option>)}
      </select>
      <div className="event-when">
        <label className="inline-field">Date<input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label className="check"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /><span>All day</span></label>
        {!allDay && (
          <>
            <label className="inline-field">From<input id="ev-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></label>
            <label className="inline-field">To<input id="ev-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></label>
          </>
        )}
      </div>
      <label htmlFor="ev-where">Where (optional)</label>
      <input id="ev-where" value={location} onChange={(e) => setLocation(e.target.value)} />
      <button type="submit" className="btn btn--primary" disabled={busy || !title.trim()}>
        {busy ? 'Adding…' : 'Add to calendar'}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
