import { useStore } from '../data/StoreContext';
import { dayKey } from '../date/dayKey';
import { dinnerFor } from './logic';
import { useMeals } from './useMeals';

/** "🍽 Dinner tonight: Cottage Pie", so everyone knows what is coming. Nothing when nothing is planned. */
export function DinnerTonight({ now }: { now: Date }) {
  const meals = useMeals(useStore());
  const dinner = dinnerFor(meals.plan, meals.recipes, dayKey(now));
  if (!dinner) return null;
  return (
    <section className="dinner-tonight" aria-label={`Dinner tonight: ${dinner.name}`}>
      <span className="dinner-icon" aria-hidden="true">🍽</span>
      <span className="dinner-text">
        <span className="dinner-label">Dinner tonight</span>
        <span className="dinner-name">{dinner.name}</span>
      </span>
    </section>
  );
}
