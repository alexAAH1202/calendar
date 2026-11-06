import { useState, type FormEvent } from 'react';
import { ConfirmButton } from '../components/ConfirmButton';
import { newId } from '../data/ids';
import { ColesButton } from '../wall/ColesButton';
import { AISLES, AISLE_ORDER } from './data';
import { mergeDuplicates } from './logic';
import type { AisleKey, ShopItem } from './types';
import type { Meals } from './useMeals';

/** The shopping list, by aisle; shared, so whoever is at the shop sees the same list. */
export function ShoppingTab({ meals }: { meals: Meals }) {
  const { shopping } = meals;
  const [name, setName] = useState('');
  const [cat, setCat] = useState<AisleKey>('extra');
  const [closed, setClosed] = useState<Set<AisleKey>>(new Set());
  const [message, setMessage] = useState<string>();
  const items = shopping.items;
  const set = (f: (l: ShopItem[]) => ShopItem[]) => shopping.commit(f(shopping.current()));

  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    set((l) => [...l, { id: newId('sh'), name: name.trim(), cat, done: false }]);
    setName('');
  };

  return (
    <>
      <form className="add-step chore-form" onSubmit={add}>
        <input id="shop-item" value={name} onChange={(e) => setName(e.target.value)} placeholder="Add an item…" aria-label="Add an item" />
        <select id="shop-cat" value={cat} onChange={(e) => setCat(e.target.value as AisleKey)} aria-label="Aisle">
          {AISLE_ORDER.map((k) => <option key={k} value={k}>{AISLES[k].icon} {AISLES[k].label}</option>)}
        </select>
        <button type="submit" className="btn btn--primary" disabled={!name.trim()}>+ Add</button>
      </form>
      <div className="editor-row editor-row--start">
        <ColesButton />
        <button type="button" className="pill" onClick={() => { const m = mergeDuplicates(shopping.current()); shopping.commit(m.list); setMessage(m.merged ? `Merged ${m.merged} duplicate${m.merged > 1 ? 's' : ''}.` : 'No duplicates found.'); }}>⊕ Merge duplicates</button>
        <button type="button" className="pill" onClick={() => set((l) => l.map((i) => ({ ...i, done: true })))}>✓ Tick all</button>
        <button type="button" className="pill" onClick={() => set((l) => l.map((i) => ({ ...i, done: false })))}>↺ Untick all</button>
        <ConfirmButton className="pill" confirmText="Tap again to remove ticked" onConfirm={() => set((l) => l.filter((i) => !i.done))}>🗑 Remove ticked</ConfirmButton>
        <button type="button" className="pill" onClick={() => window.print()}>🖨 Print</button>
        <button type="button" className="pill" onClick={shopping.undo} disabled={!shopping.canUndo}>Undo</button>
      </div>
      {message && <p className="notice notice--info" role="status">{message}</p>}
      {!shopping.loaded ? (
        <p className="hint">Loading…</p>
      ) : items.length === 0 ? (
        <p className="hint">The list is empty. Add meals from Plan or Recipes, or send what is missing from the Pantry.</p>
      ) : (
        AISLE_ORDER.filter((k) => items.some((i) => (i.cat || 'extra') === k)).map((k) => {
          const inAisle = items.filter((i) => (i.cat || 'extra') === k);
          const open = !closed.has(k);
          return (
            <section key={k} className="shop-aisle" style={{ borderTopColor: AISLES[k].colour }}>
              <button type="button" className="shop-aisle-head" aria-expanded={open}
                onClick={() => setClosed((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; })}>
                {AISLES[k].icon} {AISLES[k].label} <span className="dump-count">({inAisle.filter((i) => !i.done).length} to get)</span> <span aria-hidden="true">{open ? '▾' : '▸'}</span>
              </button>
              {open && (
                <ul className="shop-items">
                  {inAisle.map((i) => (
                    <li key={i.id} className={i.done ? 'is-done' : ''}>
                      <label className="check">
                        <input type="checkbox" checked={i.done} onChange={(e) => set((l) => l.map((x) => (x.id === i.id ? { ...x, done: e.target.checked } : x)))} />
                        <span>{i.name}</span>
                      </label>
                      {i.src && <span className="step-meta">{i.src}</span>}
                      <button type="button" className="pill pill--round" aria-label={`Remove ${i.name}`} onClick={() => set((l) => l.filter((x) => x.id !== i.id))}>✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}
    </>
  );
}
