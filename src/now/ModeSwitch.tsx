import { useState } from 'react';
import { MODE_ICONS, MODE_LABELS, type DayMode } from './dayMode';

const EXPLAIN: Record<DayMode, string> = {
  normal: 'Everything as usual.',
  low: 'Only the steps and chores marked essential, and just today’s picks in the brain dump. Finishing those counts as all done.',
  late: 'The same as a low-energy day: just the essentials, to get out the door.',
};

/** The day's pace: tap to choose. Goes back to a normal day by itself tomorrow. */
export function ModeSwitch({ mode, onChange }: { mode: DayMode; onChange: (m: DayMode) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={`pill mode-pill mode-pill--${mode}`} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span aria-hidden="true">{MODE_ICONS[mode]}</span> {MODE_LABELS[mode]}
      </button>
      {open && (
        <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="How is today going?">
            <div className="sheet-top">
              <h3>How is today going?</h3>
              <button type="button" className="pill" onClick={() => setOpen(false)}>Close</button>
            </div>
            <div className="mode-options">
              {(Object.keys(MODE_LABELS) as DayMode[]).map((m) => (
                <button key={m} type="button" className={`mode-option ${m === mode ? 'is-selected' : ''}`} aria-pressed={m === mode}
                  onClick={() => { onChange(m); setOpen(false); }}>
                  <span className="mode-option-title"><span aria-hidden="true">{MODE_ICONS[m]}</span> {MODE_LABELS[m]}</span>
                  <span className="mode-option-text">{EXPLAIN[m]}</span>
                </button>
              ))}
            </div>
            <p className="panel-text">It goes back to a normal day by itself tomorrow. Mark what is essential with ⋯ in Routines and Chores.</p>
          </div>
        </div>
      )}
    </>
  );
}

/** A calm line across the top when the day is not a normal one. */
export function ModeBanner({ mode }: { mode: DayMode }) {
  if (mode === 'normal') return null;
  return (
    <p className={`mode-banner mode-banner--${mode}`} role="status">
      <span aria-hidden="true">{MODE_ICONS[mode]}</span> {MODE_LABELS[mode]}: just the essentials today. That counts as all done.
    </p>
  );
}
