import { describe, expect, it } from 'vitest';
import { BUILT_IN_RECIPES, NIGHTS, PANTRY } from './data';
import { addRecipe, dinnerFor, generatePlan, guessAisle, mergeDuplicates, mondayOf, nightFor, onList, removeRecipe, sendMissing } from './logic';
import type { MealPlan, ShopItem } from './types';

let n = 0;
const id = () => `i${n++}`;
const pie = BUILT_IN_RECIPES.find((r) => r.id === 'cottage-pie')!;
const mac = BUILT_IN_RECIPES.find((r) => r.id === 'mac-cheese')!;

describe('data from meal_planner.html', () => {
  it('kept every recipe, night and pantry section', () => {
    expect(BUILT_IN_RECIPES).toHaveLength(36);
    expect(NIGHTS.map((x) => x.key).join()).toBe('fam0,fam1,fam2,fam3,fam4,fam5,fam6,fam7,cpl0,cpl1,cpl2,cpl3,cpl4,cpl5');
    expect(PANTRY.map((p) => p.aisle)).toEqual(['extra', 'extra', 'dairy', 'pantry', 'sauces', 'household']);
  });
});

describe('shopping list', () => {
  it('adds a recipe once, skipping names already there, and removes it again', () => {
    const a = addRecipe([], pie, id);
    expect(a.added).toBe(pie.ingredients.length);
    expect(onList(a.list, pie.id)).toBe(true);
    const b = addRecipe(a.list, mac, id); // shares nothing by exact name with the pie except none
    const shared = mac.ingredients.filter((i) => a.list.some((x) => x.name.toLowerCase() === i.n.toLowerCase())).length;
    expect(b.added).toBe(mac.ingredients.length - shared);
    expect(onList(removeRecipe(b.list, pie.id), pie.id)).toBe(false);
  });
  it('merges duplicates, keeping sources, and unticked wins', () => {
    const list: ShopItem[] = [
      { id: '1', name: 'Butter', cat: 'dairy', src: 'Pie', done: true },
      { id: '2', name: 'butter!', cat: 'dairy', src: 'Mac', done: false },
      { id: '3', name: 'Milk', cat: 'dairy', done: false },
    ];
    const m = mergeDuplicates(list);
    expect(m.merged).toBe(1);
    expect(m.list[0]).toMatchObject({ src: 'Pie, Mac', done: false });
  });
  it('sends unticked pantry items once, to their section’s aisle', () => {
    const sections = [{ title: 'Fridge', aisle: 'dairy' as const, items: ['Butter', 'Eggs'] }];
    const s = sendMissing([], { Butter: true }, sections, id);
    expect(s.list.map((i) => [i.name, i.cat])).toEqual([['Eggs', 'dairy']]);
    expect(sendMissing(s.list, {}, sections, id).added).toBe(1); // Butter now; Eggs already there
  });
});

describe('the fortnight and tonight', () => {
  const plan: MealPlan = { start: '2026-11-09', nights: { fam0: { meal: 'cottage-pie', mode: 'library' }, fam1: { mode: 'free', free: 'Takeaway' } } };
  it('knows tonight from the start date', () => {
    expect(nightFor(plan, '2026-11-09')).toBe('fam0');
    expect(nightFor(plan, '2026-11-17')).toBe('cpl0');
    expect(nightFor(plan, '2026-11-23')).toBeUndefined();
    expect(nightFor(plan, '2026-11-08')).toBeUndefined();
    expect(dinnerFor(plan, BUILT_IN_RECIPES, '2026-11-09')?.name).toBe('Cottage Pie');
    expect(dinnerFor(plan, BUILT_IN_RECIPES, '2026-11-10')?.name).toBe('Takeaway');
    expect(dinnerFor(plan, BUILT_IN_RECIPES, '2026-11-11')).toBeUndefined();
  });
  it('the start is the Monday of the week', () => {
    expect(mondayOf(new Date(2026, 10, 12))).toBe('2026-11-09');
  });
  it('plan my week fills only empty nights, family nights with kids’ recipes, without repeats', () => {
    const { plan: p, picked } = generatePlan(plan, BUILT_IN_RECIPES, { count: 7, who: 'family', onlyEmpty: true }, () => 0.5);
    expect(picked).toHaveLength(6); // fam2..fam7
    expect(p.nights.fam0.meal).toBe('cottage-pie');
    expect(new Set(picked.map((r) => r.id)).size).toBe(6);
    expect(picked.every((r) => r.tags.includes('Kids') || r.tags.includes('★ Yours'))).toBe(true);
    const c = generatePlan(plan, BUILT_IN_RECIPES, { count: 3, who: 'couples', onlyEmpty: true }, () => 0);
    expect(c.picked.every((r) => r.tags.includes('Couples'))).toBe(true);
    expect(Object.keys(c.plan.nights).filter((k) => k.startsWith('cpl'))).toEqual(['cpl0', 'cpl1', 'cpl2']);
  });
});

describe('guessing the aisle of an imported ingredient', () => {
  it('reads common words', () => {
    expect(guessAisle('500g chicken thigh fillets')).toBe('meat');
    expect(guessAisle('1 cup frozen peas')).toBe('frozen');
    expect(guessAisle('2 tbsp soy sauce')).toBe('sauces');
    expect(guessAisle('1 brown onion, diced')).toBe('produce');
    expect(guessAisle('1 cup GF plain flour')).toBe('pantry');
    expect(guessAisle('Something unusual')).toBe('extra');
  });
});
