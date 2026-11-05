import { useState } from 'react';
import { COMMON_EMOJI, singleEmoji } from './emoji';

interface Props {
  value: string;
  onPick: (emoji: string) => void;
  onClose: () => void;
}

/** A grid of common emoji plus a box for any emoji from the phone or tablet keyboard. */
export function EmojiPicker({ value, onPick, onClose }: Props) {
  const [typed, setTyped] = useState('');
  const custom = singleEmoji(typed);

  return (
    <div className="emoji-picker" role="dialog" aria-label="Choose a symbol">
      <div className="emoji-grid">
        {COMMON_EMOJI.map((e) => (
          <button key={e} type="button" className={`emoji-option ${e === value ? 'is-current' : ''}`}
            aria-label={`Use ${e}`} aria-pressed={e === value} onClick={() => onPick(e)}>
            {e}
          </button>
        ))}
      </div>
      <div className="emoji-custom">
        <input
          id="emoji-custom-input"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder="Or type any emoji"
          aria-label="Type any emoji"
          inputMode="text"
        />
        <button type="button" className="btn btn--primary" disabled={!custom}
          onClick={() => custom && onPick(custom)}>
          Use {custom ?? ''}
        </button>
        <button type="button" className="btn" onClick={onClose}>Cancel</button>
      </div>
      {typed && !custom && <p className="emoji-hint">One emoji only, from the keyboard’s emoji key.</p>}
    </div>
  );
}
