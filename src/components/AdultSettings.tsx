import { useState } from 'react';
import { newId } from '../data/ids';
import { PERSON_COLOURS } from '../data/profile';
import { useStore } from '../data/StoreContext';
import type { Person } from '../data/types';
import { Avatar } from './Avatar';
import { ConfirmButton } from './ConfirmButton';
import { EmojiPicker } from './EmojiPicker';

/** Adults who get a row on the calendar timeline. They do not need an account. */
export function AdultSettings({ adults, everyone }: { adults: Person[]; everyone: Person[] }) {
  const store = useStore();
  const [picking, setPicking] = useState<string | null>(null);

  const add = () => {
    const used = new Set(everyone.map((p) => p.colour));
    void store.savePerson({
      id: newId('a'),
      name: 'New adult',
      role: 'parent',
      colour: PERSON_COLOURS.find((c) => !used.has(c)) ?? PERSON_COLOURS[0],
      order: Math.max(0, ...adults.map((p) => p.order ?? 0)) + 1,
    });
  };

  return (
    <section className="panel" aria-label="Adults on the calendar">
      <h3>Adults on the calendar</h3>
      <p className="panel-text">
        Each adult gets a row on the family timeline, so events can be marked as theirs whoever added them. They do not need to sign in.
      </p>
      <ul className="adult-list">
        {adults.map((a) => (
          <li key={a.id} className="adult-row">
            <button type="button" className="emoji-button" aria-label={`Symbol for ${a.name}. Change`} onClick={() => setPicking(picking === a.id ? null : a.id)}>
              <Avatar name={a.name} colour={a.colour} image={a.avatar} size={40} />
            </button>
            <input defaultValue={a.name} key={a.name} aria-label={`Name for ${a.name}`}
              onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== a.name && void store.updatePerson(a.id, { name: e.target.value.trim() })}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
            <span className="swatches" role="group" aria-label={`Colour for ${a.name}`}>
              {PERSON_COLOURS.map((c) => (
                <button key={c} type="button" className={`swatch swatch--small ${c === a.colour ? 'is-selected' : ''}`} style={{ background: c }}
                  aria-pressed={c === a.colour} aria-label={`Colour ${c}`} onClick={() => void store.updatePerson(a.id, { colour: c })}>
                  {c === a.colour ? '✓' : ''}
                </button>
              ))}
            </span>
            <ConfirmButton className="pill" confirmText="Tap again to remove" onConfirm={() => void store.deletePerson(a.id, [])}>Remove</ConfirmButton>
            {picking === a.id && (
              <div className="adult-picker">
                <EmojiPicker value={a.avatar?.replace(/^emoji:/, '') ?? ''} onPick={(e) => { void store.updatePerson(a.id, { avatar: `emoji:${e}` }); setPicking(null); }} onClose={() => setPicking(null)} />
              </div>
            )}
          </li>
        ))}
      </ul>
      <button type="button" className="btn" onClick={add}>+ Add adult</button>
    </section>
  );
}
