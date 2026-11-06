import { useEffect, useState } from 'react';
import type { FamilyStore } from '../data/store';
import { useItemList } from '../lists/useItemList';
import { BUILT_IN_RECIPES } from './data';
import type { MealPlan, Recipe, ShopItem } from './types';

/**
 * The meal planner's data, shared by the whole family (meals/*):
 * your own recipes, the shopping list, the fortnight plan and the pantry ticks.
 */
export function useMeals(store: FamilyStore) {
  const custom = useItemList<Recipe>(store, ['meals', 'recipes']);
  const shopping = useItemList<ShopItem>(store, ['meals', 'shopping']);
  const [plan, setPlan] = useState<MealPlan>({ nights: {} });
  const [have, setHave] = useState<Record<string, boolean>>({});
  const [planLoaded, setPlanLoaded] = useState(false);
  useEffect(
    () =>
      store.watchDoc<MealPlan>(['meals', 'plan'], (d) => {
        setPlan({ nights: {}, ...d });
        setPlanLoaded(true);
      }),
    [store],
  );
  useEffect(() => store.watchDoc<{ have?: Record<string, boolean> }>(['meals', 'pantry'], (d) => setHave(d?.have ?? {})), [store]);

  return {
    recipes: [...BUILT_IN_RECIPES, ...custom.items],
    custom,
    shopping,
    plan,
    planLoaded,
    /** The whole plan is written each time (one small document). */
    savePlan: (p: MealPlan) => {
      setPlan(p);
      void store.putDoc(['meals', 'plan'], { start: p.start ?? null, nights: p.nights });
    },
    have,
    saveHave: (h: Record<string, boolean>) => {
      setHave(h);
      void store.putDoc(['meals', 'pantry'], { have: h });
    },
  };
}

export type Meals = ReturnType<typeof useMeals>;
