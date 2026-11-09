import { Avatar } from '../components/Avatar';
import type { LanePerson } from './lanes';

/**
 * "Who is it for?": tap people to pick one or several; nobody picked means everyone.
 * Each chip has the person's name and badge, so colour is never the only cue.
 */
export function WhoChips({ people, value, onChange, label = 'Who is it for?' }: {
  people: LanePerson[];
  value: string[];
  onChange: (ids: string[]) => void;
  label?: string;
}) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div className="field who-chips">
      <span className="field-label">{label}</span>
      <div className="tabs" role="group" aria-label={label}>
        <button type="button" className={`tab ${value.length === 0 ? 'is-selected' : ''}`} aria-pressed={value.length === 0} onClick={() => onChange([])}>
          🏠 Everyone
        </button>
        {people.map((p) => (
          <button key={p.id} type="button" className={`tab ${value.includes(p.id) ? 'is-selected' : ''}`} aria-pressed={value.includes(p.id)} onClick={() => toggle(p.id)}>
            <Avatar name={p.name} colour={p.colour} image={p.avatar} size={28} /> {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
