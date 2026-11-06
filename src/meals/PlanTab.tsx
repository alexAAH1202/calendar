import { format } from 'date-fns';
import { useState } from 'react';
import { ConfirmButton } from '../components/ConfirmButton';
import { newId } from '../data/ids';
import { dayKey } from '../date/dayKey';
import { NIGHTS } from './data';
import { addRecipe, generatePlan, mondayOf, nightDate, nightFor, onList, removeRecipe, type PlanOptions } from './logic';
import type { NightPlan, Recipe } from './types';
import type { Meals } from './useMeals';

/** The fortnight: eight family nights then six couples nights, from a start Monday. */
export function PlanTab({ meals, now }: { meals: Meals; now: Date }) {
  const { plan, recipes, shopping } = meals;
  const [planning, setPlanning] = useState(false);
  const [message, setMessage] = useState<string>();
  const tonight = nightFor(plan, dayKey(now));
  const sections = [...new Set(recipes.map((r) => r.section))];

  const setNight = (key: string, n: NightPlan) => meals.savePlan({ ...plan, nights: { ...plan.nights, [key]: n } });
  /** Picking a library meal puts its ingredients on the shopping list, as the planner always did. */
  const pick = (key: string, mealId: string) => {
    setNight(key, { ...plan.nights[key], meal: mealId || undefined, mode: 'library', done: false });
    const r = recipes.find((x) => x.id === mealId);
    if (r && !onList(shopping.current(), r.id)) {
      const { list, added } = addRecipe(shopping.current(), r, () => newId('sh'));
      shopping.commit(list);
      setMessage(`“${r.name}”: ${added} items added to the shopping list.`);
    }
  };
  const toggleList = (r: Recipe) => {
    if (onList(shopping.current(), r.id)) {
      shopping.commit(removeRecipe(shopping.current(), r.id));
      setMessage(`Removed “${r.name}” from the shopping list.`);
    } else {
      const { list, added } = addRecipe(shopping.current(), r, () => newId('sh'));
      shopping.commit(list);
      setMessage(`“${r.name}”: ${added} items added to the shopping list.`);
    }
  };
  const generate = (o: PlanOptions) => {
    const { plan: next, picked } = generatePlan(plan, recipes, o);
    meals.savePlan(next);
    let list = shopping.current();
    let items = 0;
    for (const r of picked) {
      if (onList(list, r.id)) continue;
      const res = addRecipe(list, r, () => newId('sh'));
      list = res.list;
      items += res.added;
    }
    shopping.commit(list);
    setPlanning(false);
    setMessage(picked.length ? `Planned ${picked.length} dinner${picked.length === 1 ? '' : 's'}; ${items} new items on the shopping list.` : 'No empty nights to fill.');
  };

  const row = (key: string, day: string, family: boolean, index: number) => {
    const n = plan.nights[key] ?? {};
    const free = n.mode === 'free';
    const r = !free ? recipes.find((x) => x.id === n.meal) : undefined;
    const date = plan.start ? format(nightDate(plan.start, index), 'EEE d MMM') : day;
    return (
      <li key={key} className={`plan-row ${n.done ? 'is-done' : ''} ${key === tonight ? 'is-tonight' : ''}`}>
        <div className="plan-top">
          <label className="check" title="Cooked">
            <input type="checkbox" checked={!!n.done} onChange={(e) => setNight(key, { ...n, done: e.target.checked })} aria-label={`${date} cooked`} />
          </label>
          <span className="plan-day">
            <strong>{date}{key === tonight ? ' · tonight' : ''}</strong>
            <span className="step-meta">{family ? 'Family night' : 'Couples night'}</span>
          </span>
          {free ? (
            <input className="plan-input" value={n.free ?? ''} placeholder="Takeaway, leftovers, BBQ…" aria-label={`${date}: free text`}
              onChange={(e) => setNight(key, { ...n, free: e.target.value })} />
          ) : (
            <select className="plan-input" value={n.meal ?? ''} onChange={(e) => pick(key, e.target.value)} aria-label={`${date}: meal`}>
              <option value="">— choose a meal —</option>
              {sections.map((s) => (
                <optgroup key={s} label={s}>
                  {recipes.filter((x) => x.section === s).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                </optgroup>
              ))}
            </select>
          )}
          <button type="button" className="pill" onClick={() => setNight(key, { ...n, mode: free ? 'library' : 'free' })}>
            {free ? 'Library' : 'Free text'}
          </button>
          <button type="button" className="pill pill--round" aria-label={`Clear ${date}`} onClick={() => setNight(key, {})}>✕</button>
        </div>
        {r && (
          <div className="plan-detail">
            <span><strong>{r.name} · {r.time}</strong> {r.ingredients.map((i) => i.n).join(' · ')}</span>
            {r.note && <span className="plan-note">💡 {r.note}</span>}
            <span className="plan-links">
              {r.url ? <a className="pill" href={r.url} target="_blank" rel="noopener noreferrer">↗ Recipe</a> : r.tags.includes('★ Yours') && <span className="pill">★ Your recipe</span>}
              <button type="button" className={`pill ${onList(shopping.items, r.id) ? 'pill--on' : ''}`} onClick={() => toggleList(r)}>
                {onList(shopping.items, r.id) ? '✓ On the list' : '+ Add to the list'}
              </button>
            </span>
          </div>
        )}
      </li>
    );
  };

  return (
    <>
      <div className="editor-row">
        <label className="inline-field">
          Fortnight starts (Monday)
          <input id="plan-start" type="date" value={plan.start ?? ''} onChange={(e) => meals.savePlan({ ...plan, start: e.target.value || undefined })} />
        </label>
        {!plan.start && <button type="button" className="btn" onClick={() => meals.savePlan({ ...plan, start: mondayOf(now) })}>Start this Monday</button>}
        <div className="toolbar">
          <button type="button" className="btn btn--primary" onClick={() => setPlanning(true)}>🎲 Plan my week</button>
          <ConfirmButton className="btn btn--danger" confirmText="Tap again: clear every night"
            onConfirm={() => { meals.savePlan({ ...plan, nights: {} }); setMessage('Fortnight cleared. The shopping list is kept.'); }}>
            ↺ Reset fortnight
          </ConfirmButton>
        </div>
      </div>
      {!plan.start && <p className="panel-text">Set the start Monday so the wall can show “Dinner tonight”.</p>}
      {message && <p className="notice notice--info" role="status">{message}</p>}
      <h4 className="meals-heading">🧒 Family nights (8)</h4>
      <ol className="plan-list">{NIGHTS.map((n, i) => (n.family ? row(n.key, n.day, true, i) : null))}</ol>
      <h4 className="meals-heading">💑 Couples nights (6)</h4>
      <ol className="plan-list">{NIGHTS.map((n, i) => (!n.family ? row(n.key, n.day, false, i) : null))}</ol>
      {planning && <PlanSheet onPlan={generate} onClose={() => setPlanning(false)} />}
    </>
  );
}

function PlanSheet({ onPlan, onClose }: { onPlan: (o: PlanOptions) => void; onClose: () => void }) {
  const [count, setCount] = useState(7);
  const [who, setWho] = useState<PlanOptions['who']>('both');
  const [onlyEmpty, setOnlyEmpty] = useState(true);
  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Plan my week">
        <div className="sheet-top"><h3>🎲 Plan my week</h3><button type="button" className="pill" onClick={onClose}>Cancel</button></div>
        <label className="inline-field">How many dinners? <strong>{count}</strong>
          <input id="plan-count" type="range" min={1} max={14} value={count} onChange={(e) => setCount(Number(e.target.value))} />
        </label>
        <div className="field">
          <span className="field-label">Who are these dinners for?</span>
          <div className="tabs" role="group" aria-label="Who">
            {([['both', '👨‍👩‍👧‍👦 Both'], ['family', '🧒 Family nights'], ['couples', '💑 Couples nights']] as const).map(([v, l]) => (
              <button key={v} type="button" className={`tab ${who === v ? 'is-selected' : ''}`} aria-pressed={who === v} onClick={() => setWho(v)}>{l}</button>
            ))}
          </div>
        </div>
        <label className="check"><input type="checkbox" checked={onlyEmpty} onChange={(e) => setOnlyEmpty(e.target.checked)} /><span>Only fill empty nights (keep existing choices)</span></label>
        <div className="sheet-actions"><button type="button" className="btn btn--primary" onClick={() => onPlan({ count, who, onlyEmpty })}>🎲 Make the plan</button></div>
      </div>
    </div>
  );
}
