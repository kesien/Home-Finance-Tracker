import { describe, it, expect } from 'vitest';
import { compareMonths } from './compare.js';

const m = (income, expense, cats, acc = 0, sav = 0) => ({
  month: { accountBalance: acc, savingsBalance: sav },
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
  it('kategóriák uniója, hiányzó érték 0, a legnagyobb eltérés elöl', () => {
    expect(r.categories.map((c) => [c.name, c.a, c.b, c.diff])).toEqual([
      ['Hitel', 400, 0, -400],
      ['Állat', 0, 300, 300],
      ['Rezsi', 100, 150, 50],
    ]);
  });
});
