import { describe, it, expect } from 'vitest';
import { trendData, incomeComposition, categoryBreakdown, upcomingExpenses } from './stats.js';

const months = [
  { year: 2026, month: 10, totalIncome: 900, totalExpense: 400, savingsBalance: 50, incomes: [{ name: 'Apa', amount: 600 }, { name: 'Anya', amount: 300 }] },
  { year: 2026, month: 11, totalIncome: 950, totalExpense: 450, savingsBalance: 80, incomes: [{ name: 'Apa', amount: 600 }, { name: 'Apa', amount: 50 }, { name: 'Családi', amount: 300 }] },
];

describe('stats', () => {
  it('trend', () => {
    expect(trendData(months)[1]).toEqual({ label: '26. nov', income: 950, expense: 450, savings: 80 });
  });
  it('bevételi összetétel: azonos nevek összeadva, hiányzó név nincs a sorban', () => {
    const { rows, names } = incomeComposition(months);
    expect(names).toEqual(['Apa', 'Anya', 'Családi']);
    expect(rows[1]).toEqual({ label: '26. nov', Apa: 650, Családi: 300 });
    expect(rows[0].Családi).toBeUndefined();
  });
  it('kategóriák csökkenő sorrendben, nulla nélkül', () => {
    const r = categoryBreakdown({ 1: 100, 2: 300, 3: 0 }, [{ id: 1, name: 'Rezsi' }, { id: 2, name: 'Hitel' }, { id: 3, name: 'Állat' }]);
    expect(r.map((c) => c.name)).toEqual(['Hitel', 'Rezsi']);
  });
  it('közelgő: csak beleszámító, kifizetetlen; éves elöl', () => {
    const e = [
      { id: 1, type: 'monthly', amount: 500, counted: true, paid: false },
      { id: 2, type: 'monthly', amount: 900, counted: true, paid: true },
      { id: 3, type: 'yearly', amount: 100, counted: true, paid: false },
      { id: 4, type: 'yearly', amount: 700, counted: false, paid: false },
      { id: 5, type: 'monthly', amount: 800, counted: true, paid: false },
    ];
    expect(upcomingExpenses(e).map((x) => x.id)).toEqual([3, 5, 1]);
  });
});
