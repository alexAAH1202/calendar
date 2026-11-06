export type AisleKey = 'produce' | 'meat' | 'dairy' | 'gf-bread' | 'pantry' | 'frozen' | 'sauces' | 'household' | 'extra';

export interface Ingredient {
  /** Name with quantity, e.g. "Chicken thighs × 4". */
  n: string;
  /** Aisle. */
  c: AisleKey;
}

export interface Recipe {
  id: string;
  section: string;
  name: string;
  time: string;
  tags: string[];
  url: string;
  note: string;
  ingredients: Ingredient[];
}

export interface PantrySection {
  title: string;
  /** Aisle the missing items go to on the shopping list. */
  aisle: AisleKey;
  items: string[];
}

/** One night in the fortnight. */
export interface Night {
  key: string;
  day: string;
  family: boolean;
}

/** meals/shopping: items array. `mid` links an item to the recipe that added it. */
export interface ShopItem {
  id: string;
  name: string;
  cat: AisleKey;
  mid?: string;
  src?: string;
  done: boolean;
}

export interface NightPlan {
  /** A recipe id from the library. */
  meal?: string;
  /** Free text instead: takeaway, leftovers, BBQ… */
  free?: string;
  mode?: 'library' | 'free';
  done?: boolean;
}

/** meals/plan */
export interface MealPlan {
  /** yyyy-MM-dd of the fortnight's first night (a Monday), so "tonight" is known. */
  start?: string;
  nights: Record<string, NightPlan>;
}
