import { MONTH_NAMES } from './format.js';

const shortLabel = (m) => `${String(m.year).slice(2)}. ${MONTH_NAMES[m.month - 1].slice(0, 3)}`;

/** Havi trend: bevétel, kiadás, megtakarítás. */
export function trendData(months) {
  return months.map((m) => ({ label: shortLabel(m), income: m.totalIncome, expense: m.totalExpense, savings: m.savingsBalance }));
}

/** Egy bevételi név kulcsa a sor-objektumban; az előtag miatt nem ütközhet a `label` mezővel. */
export const incomeKey = (name) => `inc:${name}`;

/** Bevételi összetétel: soronként egy hónap, oszloponként egy bevételi név (azonos nevek összeadva). */
export function incomeComposition(months) {
  const names = [];
  const rows = months.map((m) => {
    const row = { label: shortLabel(m) };
    for (const i of m.incomes) {
      if (!names.includes(i.name)) names.push(i.name);
      row[incomeKey(i.name)] = (row[incomeKey(i.name)] ?? 0) + i.amount;
    }
    return row;
  });
  return { rows, names };
}

/** Kategóriák egy hónapban, csökkenő sorrendben (csak a pozitív összegek). */
export function categoryBreakdown(categoryTotals, categories) {
  const names = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  return Object.entries(categoryTotals)
    .map(([id, value]) => ({ id: Number(id), name: names[id] ?? '?', value }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
}

/** Közelgő kiadások: ebben a hónapban beleszámító, még ki nem fizetett tételek; az éves (esedékes) elöl. */
export function upcomingExpenses(expenses) {
  return expenses
    .filter((e) => e.counted && !e.paid)
    .sort((a, b) => (a.type === b.type ? b.amount - a.amount : a.type === 'yearly' ? -1 : 1));
}
