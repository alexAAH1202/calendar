import { useState } from 'react';
import { ConfirmButton } from '../components/ConfirmButton';
import { newId } from '../data/ids';
import { addRecipe, onList, removeRecipe } from './logic';
import { RecipeSheet } from './RecipeSheet';
import type { Recipe } from './types';
import type { Meals } from './useMeals';

const FILTERS = ['All', 'Kids', 'Couples', 'Quick', 'Batch', '★ Yours'];

/** The recipe library, by section, with a filter; your own recipes can be changed or deleted. */
export function RecipesTab({ meals }: { meals: Meals }) {
  const { recipes, shopping, custom } = meals;
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Recipe | 'new' | null>(null);
  const [message, setMessage] = useState<string>();
  const customIds = new Set(custom.items.map((r) => r.id));
  const shown = recipes.filter(
    (r) => (filter === 'All' || r.tags.includes(filter)) && (!search.trim() || `${r.name} ${r.ingredients.map((i) => i.n).join(' ')}`.toLowerCase().includes(search.trim().toLowerCase())),
  );
  const sections = [...new Set(shown.map((r) => r.section))];

  const toggle = (r: Recipe) => {
    if (onList(shopping.current(), r.id)) {
      shopping.commit(removeRecipe(shopping.current(), r.id));
      setMessage(`Removed “${r.name}” from the shopping list.`);
    } else {
      const { list, added } = addRecipe(shopping.current(), r, () => newId('sh'));
      shopping.commit(list);
      setMessage(`“${r.name}”: ${added} items added to the shopping list.`);
    }
  };

  return (
    <>
      <div className="editor-row">
        <button type="button" className="btn btn--primary" onClick={() => setEditing('new')}>✦ Add your own recipe</button>
        <input className="meals-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a recipe or ingredient…" aria-label="Find a recipe" />
      </div>
      <div className="tabs" role="group" aria-label="Show">
        {FILTERS.map((f) => (
          <button key={f} type="button" className={`tab ${filter === f ? 'is-selected' : ''}`} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      {message && <p className="notice notice--info" role="status">{message}</p>}
      {sections.length === 0 && <p className="hint">No recipes match.</p>}
      {sections.map((s) => (
        <section key={s} aria-label={s}>
          <h4 className="meals-heading">{s}</h4>
          <div className="recipe-grid">
            {shown.filter((r) => r.section === s).map((r) => {
              const on = onList(shopping.items, r.id);
              return (
                <article key={r.id} className={`recipe-card ${on ? 'is-on' : ''}`}>
                  <h5>{r.name}</h5>
                  <p className="recipe-meta">⏱ {r.time}{r.url && <> · <a href={r.url} target="_blank" rel="noopener noreferrer">Recipe ↗</a></>}</p>
                  <p className="recipe-tags">{r.tags.map((t) => <span key={t} className="recipe-tag">{t}</span>)}</p>
                  {r.note && <p className="recipe-note">💡 {r.note}</p>}
                  <p className="recipe-ings"><strong>Ingredients:</strong> {r.ingredients.map((i) => i.n).join(' · ')}</p>
                  <div className="recipe-actions">
                    <button type="button" className={`btn ${on ? '' : 'btn--primary'}`} onClick={() => toggle(r)}>
                      {on ? '✓ On the list (remove)' : '+ Add to shopping list'}
                    </button>
                    {customIds.has(r.id) && (
                      <>
                        <button type="button" className="pill" onClick={() => setEditing(r)}>✏ Change</button>
                        <ConfirmButton className="pill" confirmText="Tap again to delete"
                          onConfirm={() => { custom.commit(custom.current().filter((x) => x.id !== r.id)); shopping.commit(removeRecipe(shopping.current(), r.id)); }}>
                          🗑
                        </ConfirmButton>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
      {editing && (
        <RecipeSheet recipe={editing === 'new' ? undefined : editing} sections={[...new Set(recipes.map((r) => r.section))]}
          onSave={(r) => {
            const cur = custom.current();
            custom.commit(cur.some((x) => x.id === r.id) ? cur.map((x) => (x.id === r.id ? r : x)) : [...cur, r]);
            setMessage(`Saved “${r.name}”.`);
            setEditing(null);
          }}
          onClose={() => setEditing(null)} />
      )}
    </>
  );
}
