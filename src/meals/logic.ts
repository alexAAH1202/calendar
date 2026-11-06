import { addDays, differenceInCalendarDays, format, startOfWeek } from 'date-fns';
import { NIGHTS } from './data';
import type { AisleKey, MealPlan, NightPlan, PantrySection, Recipe, ShopItem } from './types';

/** Same rule as the original planner: case and punctuation do not matter when matching names. */
export const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();

export const onList = (list: ShopItem[], recipeId: string) => list.some((i) => i.mid === recipeId);

/** Adds a recipe's ingredients, skipping any already on the list by name. */
export function addRecipe(list: ShopItem[], r: Recipe, newId: () => string): { list: ShopItem[]; added: number } {
  const out = [...list];
  let added = 0;
  for (const ing of r.ingredients) {
    if (out.some((i) => norm(i.name) === norm(ing.n))) continue;
    out.push({ id: newId(), name: ing.n, cat: ing.c, mid: r.id, src: r.name, done: false });
    added++;
  }
  return { list: out, added };
}

export const removeRecipe = (list: ShopItem[], recipeId: string) => list.filter((i) => i.mid !== recipeId);

/** Folds items with the same name together, keeping where each came from; unticked wins. */
export function mergeDuplicates(list: ShopItem[]): { list: ShopItem[]; merged: number } {
  const seen = new Map<string, ShopItem>();
  const out: ShopItem[] = [];
  for (const item of list) {
    const k = norm(item.name);
    const ex = seen.get(k);
    if (!ex) {
      const copy = { ...item };
      seen.set(k, copy);
      out.push(copy);
    } else {
      if (item.src && ex.src && !ex.src.split(', ').includes(item.src)) ex.src = `${ex.src}, ${item.src}`;
      if (!item.done) ex.done = false;
    }
  }
  return { list: out, merged: list.length - out.length };
}

/** Everything in the pantry check not ticked as "have it", and not already on the list. */
export function sendMissing(list: ShopItem[], have: Record<string, boolean>, sections: PantrySection[], newId: () => string) {
  const out = [...list];
  let added = 0;
  for (const s of sections) {
    for (const item of s.items) {
      if (have[item] || out.some((i) => norm(i.name) === norm(item))) continue;
      out.push({ id: newId(), name: item, cat: s.aisle, src: 'Pantry check', done: false });
      added++;
    }
  }
  return { list: out, added };
}

/** Monday of the week containing `d`, as yyyy-MM-dd. */
export const mondayOf = (d: Date) => format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');

/** The local date of each night in the fortnight, from the start date. */
export function nightDate(start: string, index: number): Date {
  return addDays(new Date(`${start}T12:00:00`), index);
}

/** The night key for `today` (yyyy-MM-dd), if the fortnight covers it. */
export function nightFor(plan: MealPlan | undefined, today: string): string | undefined {
  if (!plan?.start) return undefined;
  const i = differenceInCalendarDays(new Date(`${today}T12:00:00`), new Date(`${plan.start}T12:00:00`));
  return i >= 0 && i < NIGHTS.length ? NIGHTS[i].key : undefined;
}

/** "Cottage Pie", "Takeaway", or undefined when nothing is planned for that night. */
export function dinnerFor(plan: MealPlan | undefined, recipes: Recipe[], today: string): { name: string; recipe?: Recipe } | undefined {
  const key = nightFor(plan, today);
  const n = key ? plan!.nights[key] : undefined;
  if (!n) return undefined;
  if (n.mode === 'free') return n.free?.trim() ? { name: n.free.trim() } : undefined;
  const r = recipes.find((x) => x.id === n.meal);
  return r ? { name: r.name, recipe: r } : undefined;
}

export const isEmptyNight = (n: NightPlan | undefined) => !n || (n.mode === 'free' ? !n.free?.trim() : !n.meal);

/** Family nights prefer Kids and your own recipes; couples nights prefer Couples; else anything. */
function poolFor(family: boolean, recipes: Recipe[]): Recipe[] {
  const preferred = recipes.filter((r) => (family ? r.tags.includes('Kids') || r.tags.includes('★ Yours') : r.tags.includes('Couples')));
  return preferred.length ? preferred : recipes;
}

export interface PlanOptions {
  count: number;
  who: 'both' | 'family' | 'couples';
  onlyEmpty: boolean;
}

/** "Plan my week": fills nights from the library without repeating a recipe while others are left. */
export function generatePlan(plan: MealPlan, recipes: Recipe[], o: PlanOptions, rand: () => number = Math.random) {
  let slots = NIGHTS.filter((n) => (o.who === 'both' ? true : o.who === 'family' ? n.family : !n.family));
  if (o.onlyEmpty) slots = slots.filter((n) => isEmptyNight(plan.nights[n.key]));
  slots = slots.slice(0, o.count);
  const used = new Set<string>();
  const nights = { ...plan.nights };
  const picked: Recipe[] = [];
  for (const n of slots) {
    let pool = poolFor(n.family, recipes).filter((r) => !used.has(r.id));
    if (!pool.length) pool = poolFor(n.family, recipes);
    if (!pool.length) continue;
    const r = pool[Math.floor(rand() * pool.length)];
    used.add(r.id);
    nights[n.key] = { meal: r.id, mode: 'library', done: false };
    picked.push(r);
  }
  return { plan: { ...plan, nights }, picked };
}

const AISLE_WORDS: [AisleKey, RegExp][] = [
  ['meat', /\b(chicken|beef|pork|lamb|mince|bacon|ham|sausage|steak|fish|salmon|prawn|tuna|turkey|chorizo|shank|ribs?|fillets?)\b/],
  ['dairy', /\b(milk|cream|cheese|butter|yoghurt|yogurt|eggs?|parmesan|feta|mozzarella|ghee|sour cream)\b/],
  ['gf-bread', /\b(rice|pasta|spaghetti|noodles?|bread|rolls?|tortillas?|wraps?|breadcrumbs|panko|couscous|quinoa)\b/],
  ['frozen', /\b(frozen|peas|ice cream)\b/],
  ['sauces', /\b(sauce|oil|vinegar|tamari|soy|mustard|mayo|mayonnaise|ketchup|dressing|mirin|sriracha|honey mustard)\b/],
  ['produce', /\b(onion|garlic|carrots?|potato(es)?|tomato(es)?|capsicum|lettuce|spinach|broccoli|cauliflower|zucchini|mushrooms?|lemons?|limes?|apples?|celery|cucumber|herbs?|parsley|coriander|basil|ginger|avocado|corn|beans|kale|leek|pumpkin|asparagus|greens)\b/],
  ['pantry', /\b(flour|sugar|salt|pepper|stock|spice|paprika|cumin|oregano|thyme|tin|tinned|can|canned|passata|paste|cornflour|baking|vanilla|honey|oats|lentils|chickpeas|coconut)\b/],
];

/** A best guess at the aisle for an imported ingredient (the family can change it). */
export function guessAisle(name: string): AisleKey {
  const n = name.toLowerCase();
  if (/\bfrozen\b/.test(n)) return 'frozen';
  for (const [aisle, re] of AISLE_WORDS) if (re.test(n)) return aisle;
  return 'extra';
}
