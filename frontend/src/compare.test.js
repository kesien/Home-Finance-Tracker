import { describe, it, expect } from 'vitest';
import { compareMonths } from './compare.js';

const m = (income, expense, cats, acc = 0, sav = 0, cash = 0) => ({
  month: { accountBalance: acc, savingsBalance: sav, cashBalance: cash },
  summary: { totalIncome: income, totalExpense: expense, remaining: income - expense, categoryTotals: cats },
});
const categories = [{ id: 1, name: 'Rezsi' }, { id: 2, name: 'Hitel' }, { id: 3, name: 'Állat' }];

describe('compareMonths', () => {
  const r = compareMonths(m(800, 500, { 1: 100, 2: 400 }, 50, 10), m(900, 450, { 1: 150, 3: 300 }, 70, 10), categories);
  it('összesítők: különbség = b − a', () => {
    expect(r.totals.find((t) => t.label === 'Bevétel')).toMatchObject({ a: 800, b: 900, diff: 100 });
    expect(r.totals.find((t) => t.label === 'Kiadás').diff).toBe(-50);
    expect(r.totals.find((t) => t.label === 'Fennmaradó').diff).toBe(150);
    expect(r.totals.find((t) => t.label === 'Számlán').diff).toBe(20);
  });
  it('a készpénz és az összes pénz is összehasonlítódik', () => {
    const c = compareMonths(m(0, 0, {}, 100, 200, 50), m(0, 0, {}, 100, 200, 80), categories);
    expect(c.totals.find((t) => t.label === 'Készpénz')).toMatchObject({ a: 50, b: 80, diff: 30 });
    expect(c.totals.find((t) => t.label === 'Összes pénz')).toMatchObject({ a: 350, b: 380, diff: 30 });
  });
  it('kategóriák uniója, hiányzó érték 0, a legnagyobb eltérés elöl', () => {
    expect(r.categories.map((c) => [c.name, c.a, c.b, c.diff])).toEqual([
      ['Hitel', 400, 0, -400],
      ['Állat', 0, 300, 300],
      ['Rezsi', 100, 150, 50],
    ]);
  });
});
