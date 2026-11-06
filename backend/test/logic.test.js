import { describe, it, expect } from 'vitest';
import { isCounted, summarize, averageLastN, itemsToCopy, nextMonth } from '../src/logic.js';

const monthly = (o = {}) => ({ id: 1, type: 'monthly', amount: 1000, category_id: 1, paid: 0, ...o });
const yearly = (o = {}) => ({ id: 2, type: 'yearly', amount: 120000, category_id: 1, paid: 0, due_year: 2027, due_month: 12, ...o });

describe('isCounted', () => {
  it('éves tétel csak az esedékes hónapban számít, teljes összeggel', () => {
    expect(isCounted(yearly(), 2027, 12)).toBe(true);
    expect(isCounted(yearly(), 2027, 11)).toBe(false);
    expect(isCounted(yearly(), 2028, 12)).toBe(false);
  });
  it('lejárat nélküli havi tétel mindig számít', () => {
    expect(isCounted(monthly(), 2040, 1)).toBe(true);
  });
  it('havi tétel a lejárati hónapig (azt is beleértve) számít', () => {
    const m = monthly({ end_year: 2026, end_month: 12 });
    expect(isCounted(m, 2026, 12)).toBe(true);
    expect(isCounted(m, 2027, 1)).toBe(false);
  });
});

describe('summarize', () => {
  const incomes = [
    { id: 1, amount: 800000, type: 'fixed' },
    { id: 2, amount: 50000, type: 'variable' },
  ];
  it('összegez, az éves tételt csak esedékességkor számolja, nincs dupla számlálás', () => {
    const expenses = [monthly({ id: 1, amount: 100000, category_id: 3, paid: 1 }), monthly({ id: 3, amount: 20000, category_id: 3 }), yearly({ id: 2, due_year: 2026, due_month: 11, category_id: 4 })];
    const s = summarize({ incomes, expenses, year: 2026, month: 11 });
    expect(s.totalIncome).toBe(850000);
    expect(s.totalExpense).toBe(240000);
    expect(s.remaining).toBe(610000);
    expect(s.unpaid).toBe(140000);
    expect(s.categoryTotals).toEqual({ 3: 120000, 4: 120000 });
    const other = summarize({ incomes, expenses, year: 2026, month: 10 });
    expect(other.totalExpense).toBe(120000);
  });
});

describe('averageLastN', () => {
  const h = [
    { year: 2026, month: 8, value: 100 }, { year: 2026, month: 9, value: 200 },
    { year: 2026, month: 10, value: 300 }, { year: 2026, month: 11, value: 400 },
  ];
  it('az utolsó N hónap átlaga', () => {
    expect(averageLastN(h, 2026, 11, 3)).toEqual({ average: 300, monthsUsed: 3 });
    expect(averageLastN(h, 2026, 11, 1)).toEqual({ average: 400, monthsUsed: 1 });
  });
  it('kevesebb hónapnál az összes elérhető számít', () => {
    expect(averageLastN(h, 2026, 11, 10)).toEqual({ average: 250, monthsUsed: 4 });
  });
  it('a későbbi hónapokat figyelmen kívül hagyja', () => {
    expect(averageLastN(h, 2026, 9, 3)).toEqual({ average: 150, monthsUsed: 2 });
  });
  it('üres történetnél 0', () => {
    expect(averageLastN([], 2026, 11, 3)).toEqual({ average: 0, monthsUsed: 0 });
  });
});

describe('itemsToCopy', () => {
  const incomes = [{ id: 1, type: 'fixed' }, { id: 2, type: 'variable' }];
  it('csak a fix bevételek másolódnak', () => {
    expect(itemsToCopy({ incomes, expenses: [] }, 2026, 12).incomes.map((i) => i.id)).toEqual([1]);
  });
  it('a lejárt havi tétel nem másolódik, a lejárattal együtt a többi igen, paid törlődik', () => {
    const expenses = [
      monthly({ id: 1, paid: 1 }),
      monthly({ id: 2, end_year: 2026, end_month: 11 }),
      monthly({ id: 3, end_year: 2026, end_month: 12 }),
    ];
    const r = itemsToCopy({ incomes: [], expenses }, 2026, 12).expenses;
    expect(r.map((e) => e.id)).toEqual([1, 3]);
    expect(r.every((e) => e.paid === 0)).toBe(true);
    expect(r[1].end_month).toBe(12);
  });
  it('az éves tétel csak akkor másolódik, ha még nem múlt el az esedékessége', () => {
    const expenses = [yearly({ id: 1, due_year: 2026, due_month: 11 }), yearly({ id: 2, due_year: 2027, due_month: 3 })];
    expect(itemsToCopy({ incomes: [], expenses }, 2026, 12).expenses.map((e) => e.id)).toEqual([2]);
  });
});

describe('nextMonth', () => {
  it('évfordulón átlép', () => {
    expect(nextMonth(2026, 12)).toEqual({ year: 2027, month: 1 });
    expect(nextMonth(2026, 5)).toEqual({ year: 2026, month: 6 });
  });
});
