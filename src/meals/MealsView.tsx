import { useState } from 'react';
import { Tabs } from '../components/Tabs';
import { useStore } from '../data/StoreContext';
import { DinnerTonight } from './DinnerTonight';
import { PantryTab } from './PantryTab';
import { PlanTab } from './PlanTab';
import { RecipesTab } from './RecipesTab';
import { ShoppingTab } from './ShoppingTab';
import { useMeals } from './useMeals';

type Part = 'plan' | 'recipes' | 'shopping' | 'pantry';

/** The Meals tab: the fortnight plan, the recipe library, the shopping list and the pantry check. */
export function MealsView({ now }: { now: Date }) {
  const meals = useMeals(useStore());
  const [part, setPart] = useState<Part>('plan');
  const toBuy = meals.shopping.items.filter((i) => !i.done).length;
  return (
    <section className="edit-surface meals" aria-label="Meals">
      <DinnerTonight now={now} />
      <div className="editor-row">
        <Tabs<Part> label="Meals" value={part} onChange={setPart}
          options={[
            { value: 'plan', label: '📅 Plan' },
            { value: 'recipes', label: '📖 Recipes' },
            { value: 'shopping', label: `🛒 Shopping${toBuy ? ` (${toBuy})` : ''}` },
            { value: 'pantry', label: '🧺 Pantry' },
          ]} />
      </div>
      {part === 'plan' ? <PlanTab meals={meals} now={now} />
        : part === 'recipes' ? <RecipesTab meals={meals} />
        : part === 'shopping' ? <ShoppingTab meals={meals} />
        : <PantryTab meals={meals} onSent={() => setPart('shopping')} />}
    </section>
  );
}
