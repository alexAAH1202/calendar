import { useState } from 'react';
import { ConfirmButton } from '../components/ConfirmButton';
import { newId } from '../data/ids';
import { PANTRY } from './data';
import { sendMissing } from './logic';
import type { Meals } from './useMeals';

/** Tick what you already have; the rest goes to the shopping list in one tap. */
export function PantryTab({ meals, onSent }: { meals: Meals; onSent: () => void }) {
  const { have, saveHave, shopping } = meals;
  const [message, setMessage] = useState<string>();
  const send = () => {
    const { list, added } = sendMissing(shopping.current(), have, PANTRY, () => newId('sh'));
    shopping.commit(list);
    setMessage(added ? `Added ${added} missing item${added === 1 ? '' : 's'} to the shopping list.` : 'Nothing to add: everything is ticked or already on the list.');
    if (added) onSent();
  };
  return (
    <>
      <p className="panel-text"><strong>Start here every week.</strong> Tick everything you already have; what is left goes on the shopping list.</p>
      <div className="editor-row editor-row--start">
        <button type="button" className="btn btn--primary" onClick={send}>🛒 Send what is missing to the shopping list</button>
        <ConfirmButton className="btn btn--danger" confirmText="Tap again to clear every tick" onConfirm={() => saveHave({})}>↺ Clear all ticks</ConfirmButton>
      </div>
      {message && <p className="notice notice--info" role="status">{message}</p>}
      <div className="pantry-grid">
        {PANTRY.map((s) => (
          <section key={s.title} className="panel pantry-section" aria-label={s.title}>
            <h4>{s.title}</h4>
            <ul className="shop-items">
              {s.items.map((item) => (
                <li key={item} className={have[item] ? 'is-done' : ''}>
                  <label className="check">
                    <input type="checkbox" checked={!!have[item]} onChange={(e) => saveHave({ ...have, [item]: e.target.checked })} />
                    <span>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <section className="panel" aria-label="Gluten-free brand reminders">
        <h4>✅ GF brand reminders</h4>
        <ul className="done-list">
          <li><b>Soy sauce</b>: GF tamari only (Kikkoman GF, San-J)</li>
          <li><b>Oyster sauce</b>: Lee Kum Kee Panda brand is GF ✓</li>
          <li><b>Stock</b>: Massel and most Campbells are GF ✓</li>
          <li><b>Gravox Original</b>: GF ✓</li>
          <li><b>Worcestershire</b>: Lea &amp; Perrins original is GF ✓</li>
          <li><b>Pasta</b>: must be labelled GF (San Remo, Barilla GF)</li>
          <li><b>Breadcrumbs</b>, <b>bread and rolls</b>: GF brand only</li>
        </ul>
      </section>
    </>
  );
}
