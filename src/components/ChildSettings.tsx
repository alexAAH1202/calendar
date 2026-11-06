import { useEffect, useState } from 'react';
import { PALETTES, PERSON_COLOURS, TEXT_SIZES, profileOf } from '../data/profile';
import type { CompletedBehaviour, PaletteName, Person, SensoryProfile, SymbolMode, TextSize } from '../data/types';
import { ConfirmButton } from './ConfirmButton';
import { EmojiPicker } from './EmojiPicker';
import { StepImage } from './StepImage';
import { Tabs } from './Tabs';
import { useStore } from '../data/StoreContext';
import { useReward } from '../lists/useReward';

interface Props {
  person: Person;
  canDelete: boolean;
  /** Saves only the fields given. */
  onChange: (changes: Partial<Omit<Person, 'id'>>) => void;
  onDelete: () => void;
}

/** Name, symbol, colour and sensory profile for one child. Each change saves at once. */
export function ChildSettings({ person, canDelete, onChange, onDelete }: Props) {
  const profile = profileOf(person);
  const [name, setName] = useState(person.name);
  const [picking, setPicking] = useState(false);
  const reward = useReward(useStore(), person.id);
  const [rewardLabel, setRewardLabel] = useState(reward.reward.label);
  useEffect(() => setRewardLabel(reward.reward.label), [reward.reward.label]);
  useEffect(() => setName(person.name), [person.id, person.name]);

  const set = <K extends keyof SensoryProfile>(key: K, value: SensoryProfile[K]) =>
    onChange({ sensory: { [key]: value } });

  const saveName = () => {
    const n = name.trim();
    if (n && n !== person.name) onChange({ name: n });
  };

  return (
    <section className="panel" aria-label={`${person.name}’s settings`}>
      <h3>{person.name}’s settings</h3>

      <div className="field">
        <label htmlFor="child-name">Name</label>
        <div className="add-step">
          <button type="button" className="emoji-button" onClick={() => setPicking((p) => !p)}
            aria-label={`Symbol for ${person.name}. Change`}>
            {person.avatar ? <StepImage image={person.avatar} /> : '🙂'}
          </button>
          <input id="child-name" value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName}
            onKeyDown={(e) => e.key === 'Enter' && saveName()} />
        </div>
        {picking && (
          <EmojiPicker value={person.avatar?.replace(/^emoji:/, '') ?? ''}
            onPick={(e) => { onChange({ avatar: `emoji:${e}` }); setPicking(false); }}
            onClose={() => setPicking(false)} />
        )}
      </div>

      <div className="field">
        <span className="field-label">Colour</span>
        <div className="swatches" role="group" aria-label="Colour">
          {PERSON_COLOURS.map((c) => (
            <button key={c} type="button" className={`swatch ${c === person.colour ? 'is-selected' : ''}`}
              style={{ background: c }} aria-pressed={c === person.colour} aria-label={`Colour ${c}`}
              onClick={() => onChange({ colour: c })}>
              {c === person.colour ? '✓' : ''}
            </button>
          ))}
        </div>
      </div>

      <Setting label="Show the routine as">
        <Tabs<SensoryProfile['layout']> label="Show the routine as" value={profile.layout} onChange={(v) => set('layout', v)}
          options={[{ value: 'checklist', label: 'Checklist' }, { value: 'firstThen', label: 'First – Then' }]} />
      </Setting>
      <Setting label="Show">
        <Tabs<SymbolMode> label="Show" value={profile.symbolMode} onChange={(v) => set('symbolMode', v)}
          options={[{ value: 'symbols', label: 'Symbols' }, { value: 'symbolsText', label: 'Symbols and words' }, { value: 'text', label: 'Words' }]} />
      </Setting>
      <Setting label="Text size">
        <Tabs<TextSize> label="Text size" value={profile.textSize} onChange={(v) => set('textSize', v)}
          options={(Object.keys(TEXT_SIZES) as TextSize[]).map((t) => ({
            value: t, label: <span style={{ fontSize: TEXT_SIZES[t] * 0.7 }}>Aa</span>,
          }))} />
      </Setting>
      <Setting label="Done steps">
        <Tabs<CompletedBehaviour> label="Done steps" value={profile.completedBehaviour}
          onChange={(v) => set('completedBehaviour', v)}
          options={[{ value: 'stay', label: 'Stay in place' }, { value: 'moveToBottom', label: 'Move to bottom' }, { value: 'hide', label: 'Hide' }]} />
      </Setting>
      <Setting label="Colours">
        <Tabs<PaletteName> label="Colours" value={profile.palette} onChange={(v) => set('palette', v)}
          options={(Object.keys(PALETTES) as PaletteName[]).map((p) => ({ value: p, label: PALETTES[p].label }))} />
      </Setting>
      <Setting label="Brightness">
        <Tabs<string> label="Brightness" value={String(profile.brightness)} onChange={(v) => set('brightness', Number(v))}
          options={[{ value: '0.6', label: 'Dim' }, { value: '0.8', label: 'Soft' }, { value: '1', label: 'Full' }]} />
      </Setting>
      <Setting label="Motion">
        <Tabs<SensoryProfile['animation']> label="Motion" value={profile.animation} onChange={(v) => set('animation', v)}
          options={[{ value: 'none', label: 'None' }, { value: 'soft', label: 'Soft fade' }]} />
      </Setting>
      <Setting label="Sound when ticking">
        <Tabs<string> label="Sound when ticking" value={profile.sound ? 'on' : 'off'} onChange={(v) => set('sound', v === 'on')}
          options={[{ value: 'off', label: 'Off' }, { value: 'on', label: 'Soft chime' }]} />
      </Setting>

      <div className="field">
        <span className="field-label">Reward: ⭐ {reward.reward.banked} of {reward.reward.target} stars banked</span>
        <div className="add-step">
          <input id="reward-label" value={rewardLabel} onChange={(e) => setRewardLabel(e.target.value)}
            onBlur={() => rewardLabel.trim() && reward.change({ label: rewardLabel.trim().slice(0, 40) })}
            onKeyDown={(e) => e.key === 'Enter' && rewardLabel.trim() && reward.change({ label: rewardLabel.trim().slice(0, 40) })}
            aria-label="Reward" />
        </div>
        <Tabs<string> label="Stars needed" value={String(reward.reward.target)} onChange={(v) => reward.change({ target: Number(v) })}
          options={['5', '10', '20', '30', '50'].map((v) => ({ value: v, label: `${v} ⭐` }))} />
        <ConfirmButton className="btn" confirmText={`Tap again: take ${reward.reward.target} stars off`} onConfirm={reward.given}>
          Reward given
        </ConfirmButton>
      </div>

      {canDelete && (
        <ConfirmButton confirmText={`Tap again to remove ${person.name}`} onConfirm={onDelete}>
          Remove {person.name}
        </ConfirmButton>
      )}
    </section>
  );
}

function Setting({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {children}
    </div>
  );
}
