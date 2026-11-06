import { useState } from 'react';
import { BridgeError, bridgeErrorText } from '../calendar/bridge';
import { useCalendarData } from '../calendar/CalendarContext';
import { newId } from '../data/ids';
import { AISLES, AISLE_ORDER } from './data';
import { guessAisle } from './logic';
import type { AisleKey, Ingredient, Recipe } from './types';

const TAGS = ['GF', 'Kids', 'Couples', 'Quick', 'Batch', '🌿 Oil', '★ Yours'];

/** Add or change your own recipe; or import one from a recipe website through the Apps Script. */
export function RecipeSheet({ recipe, sections, onSave, onClose }: {
  recipe?: Recipe;
  sections: string[];
  onSave: (r: Recipe) => void;
  onClose: () => void;
}) {
  const cal = useCalendarData();
  const [name, setName] = useState(recipe?.name ?? '');
  const [time, setTime] = useState(recipe?.time ?? '');
  const [section, setSection] = useState(recipe?.section ?? 'Your Family Recipes');
  const [url, setUrl] = useState(recipe?.url ?? '');
  const [note, setNote] = useState(recipe?.note ?? '');
  const [tags, setTags] = useState<string[]>(recipe?.tags ?? ['GF']);
  const [ings, setIngs] = useState<Ingredient[]>(recipe?.ingredients ?? [{ n: '', c: 'produce' }, { n: '', c: 'produce' }, { n: '', c: 'produce' }]);
  const [importUrl, setImportUrl] = useState('');
  const [status, setStatus] = useState<string>();
  const [busy, setBusy] = useState(false);
  const allSections = [...new Set(['Your Family Recipes', ...sections, 'Custom'])];

  const fetchRecipe = async () => {
    if (!cal.bridge) return setStatus('Importing needs the calendar connection (Parent → Calendar), which also reads recipe pages.');
    setBusy(true);
    setStatus('Reading the recipe page…');
    try {
      const r = await cal.bridge.recipe(importUrl.trim());
      setName(r.name);
      setTime(r.time);
      setUrl(r.url);
      setNote(r.note);
      setIngs(r.ingredients.map((n) => ({ n, c: guessAisle(n) })));
      setStatus(`Imported “${r.name}”. Check the aisles and add any gluten-free swaps to the notes, then Save.`);
    } catch (e) {
      setStatus(bridgeErrorText(e instanceof BridgeError ? e.kind : 'network'));
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    const clean = ings.map((i) => ({ ...i, n: i.n.trim() })).filter((i) => i.n);
    if (!name.trim()) return setStatus('Give the recipe a name.');
    if (!clean.length) return setStatus('Add at least one ingredient.');
    onSave({ id: recipe?.id ?? newId('cx'), section, name: name.trim(), time: time.trim() || '—', tags: tags.length ? tags : ['Custom'], url: url.trim(), note: note.trim(), ingredients: clean });
  };

  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet event-form recipe-sheet" role="dialog" aria-modal="true" aria-label={recipe ? 'Change recipe' : 'Add your own recipe'}>
        <div className="sheet-top"><h3>{recipe ? 'Change recipe' : 'Add your own recipe'}</h3><button type="button" className="pill" onClick={onClose}>Cancel</button></div>
        {!recipe && (
          <div className="import-box">
            <label htmlFor="import-url">Import from a recipe website</label>
            <div className="add-step">
              <input id="import-url" type="url" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="https://www.recipetineats.com/…" />
              <button type="button" className="btn" disabled={busy || !importUrl.trim()} onClick={() => void fetchRecipe()}>{busy ? 'Reading…' : 'Fetch'}</button>
            </div>
          </div>
        )}
        {status && <p className="notice notice--info" role="status">{status}</p>}
        <label htmlFor="r-name">Recipe name</label>
        <input id="r-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Butter Chicken" />
        <div className="event-when">
          <label className="inline-field">Cook time<input id="r-time" value={time} onChange={(e) => setTime(e.target.value)} placeholder="30 min" /></label>
          <label className="inline-field">Section
            <select id="r-section" value={section} onChange={(e) => setSection(e.target.value)}>{allSections.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
        </div>
        <label htmlFor="r-url">Recipe link (optional)</label>
        <input id="r-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        <div className="tabs" role="group" aria-label="Tags">
          {TAGS.map((t) => (
            <button key={t} type="button" className={`tab ${tags.includes(t) ? 'is-selected' : ''}`} aria-pressed={tags.includes(t)}
              onClick={() => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))}>{t}</button>
          ))}
        </div>
        <label htmlFor="r-note">Tips / notes (optional)</label>
        <textarea id="r-note" className="recipe-notes" value={note} onChange={(e) => setNote(e.target.value)} placeholder="GF swaps, serving tips, family notes…" />
        <span className="field-label">Ingredients (and their aisle)</span>
        <ul className="ing-list">
          {ings.map((ing, i) => (
            <li key={i} className="ing-row">
              <input value={ing.n} onChange={(e) => setIngs((l) => l.map((x, j) => (j === i ? { ...x, n: e.target.value } : x)))} placeholder="e.g. Chicken thighs × 4" aria-label={`Ingredient ${i + 1}`} />
              <select value={ing.c} onChange={(e) => setIngs((l) => l.map((x, j) => (j === i ? { ...x, c: e.target.value as AisleKey } : x)))} aria-label={`Aisle for ingredient ${i + 1}`}>
                {AISLE_ORDER.map((k) => <option key={k} value={k}>{AISLES[k].icon} {AISLES[k].label}</option>)}
              </select>
              <button type="button" className="pill pill--round" aria-label={`Remove ingredient ${i + 1}`} onClick={() => setIngs((l) => l.filter((_, j) => j !== i))}>✕</button>
            </li>
          ))}
        </ul>
        <button type="button" className="pill" onClick={() => setIngs((l) => [...l, { n: '', c: 'produce' }])}>+ Add ingredient</button>
        <div className="sheet-actions"><button type="button" className="btn btn--primary" onClick={save}>Save recipe</button></div>
      </div>
    </div>
  );
}
