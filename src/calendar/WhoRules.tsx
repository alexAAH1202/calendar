import { useState } from 'react';
import { useCalendarData } from './CalendarContext';
import { WhoChips } from './WhoChips';

/** Parent → Calendar: "events with these words in the title go to these people". */
export function WhoRules() {
  const cal = useCalendarData();
  const [match, setMatch] = useState('');
  const [who, setWho] = useState<string[]>([]);
  const nameOf = (ids: string[]) => ids.map((id) => cal.lanePeople.find((p) => p.id === id)?.name).filter(Boolean).join(', ') || 'Everyone';
  const add = () => {
    const m = match.trim();
    if (!m) return;
    cal.saveRules([...cal.rules.filter((r) => r.match.toLowerCase() !== m.toLowerCase()), { match: m, who }]);
    setMatch(''); setWho([]);
  };
  return (
    <section className="panel" aria-label="Automatic assigning">
      <h3>Assign automatically</h3>
      <p className="panel-text">Events with a first name in the title (“Astrid swimming”) go to that person. Add your own words too.</p>
      {cal.rules.length > 0 && (
        <ul className="plain-list">
          {cal.rules.map((r) => (
            <li key={r.match}>
              “{r.match}” → {nameOf(r.who)}{' '}
              <button type="button" className="pill" onClick={() => cal.saveRules(cal.rules.filter((x) => x !== r))}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      <label className="inline-field">Title contains
        <input value={match} onChange={(e) => setMatch(e.target.value)} placeholder="swimming, school, Dr Lee…" />
      </label>
      <WhoChips people={cal.lanePeople} value={who} onChange={setWho} label="Goes to" />
      <button type="button" className="btn" disabled={!match.trim()} onClick={add}>Add rule</button>
    </section>
  );
}
