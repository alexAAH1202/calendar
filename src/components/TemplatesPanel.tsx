import { useState, type FormEvent } from 'react';
import { TIME_LABELS } from '../data/timeOfDay';
import type { Step, Template, TimeOfDay } from '../data/types';
import { ConfirmButton } from './ConfirmButton';

interface Props {
  templates: Template[];
  tod: TimeOfDay;
  currentSteps: Step[];
  listName: string;
  onApply: (template: Template, mode: 'append' | 'replace') => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
}

/** Apply a template to the list being edited, or save that list as a new template. */
export function TemplatesPanel({ templates, tod, currentSteps, listName, onApply, onSave, onDelete }: Props) {
  const [name, setName] = useState('');
  const sorted = [...templates].sort((a, b) => Number(b.timeOfDay === tod) - Number(a.timeOfDay === tod));

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || currentSteps.length === 0) return;
    onSave(name.trim());
    setName('');
  };

  return (
    <section className="panel" aria-label="Templates">
      <h3>Templates for {listName}</h3>
      <ul className="template-list">
        {sorted.map((t) => (
          <li key={t.id} className="template">
            <div className="template-text">
              <strong>{t.name}</strong>
              <span className="template-meta">{TIME_LABELS[t.timeOfDay]} · {t.steps.length} steps</span>
              <span className="template-preview" aria-hidden="true">
                {t.steps.map((s) => s.image?.replace(/^emoji:/, '') ?? '•').join(' ')}
              </span>
            </div>
            <div className="template-buttons">
              <button type="button" className="btn" onClick={() => onApply(t, 'append')}>Add steps</button>
              <ConfirmButton className="btn" confirmText="Tap again to replace" onConfirm={() => onApply(t, 'replace')}>
                Replace list
              </ConfirmButton>
              {!t.builtIn && (
                <ConfirmButton confirmText="Tap again to delete" onConfirm={() => onDelete(t.id)}>Delete</ConfirmButton>
              )}
            </div>
          </li>
        ))}
      </ul>
      <form className="add-step" onSubmit={save}>
        <input id="template-name" value={name} onChange={(e) => setName(e.target.value)}
          placeholder={`Name for this ${TIME_LABELS[tod].toLowerCase()} list`} aria-label="Template name" />
        <button type="submit" className="btn btn--primary" disabled={!name.trim() || currentSteps.length === 0}>
          Save as template
        </button>
      </form>
    </section>
  );
}
