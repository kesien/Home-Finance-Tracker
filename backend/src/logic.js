// Tiszta üzleti logika (nincs DB-hozzáférés) – egységtesztekkel lefedve.

/** Hónap sorszáma az összehasonlításhoz (2026. nov = 2026*12+10). */
export const monthIndex = (year, month) => year * 12 + (month - 1);

export function nextMonth(year, month) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/**
 * Beleszámít-e a kiadás a megadott hónap kiadásaiba?
 * - éves tétel: csak az esedékes hónapban (teljes összeg, nincs osztás)
 * - havi tétel: lejárat nélkül mindig, lejárattal a lejárati hónapig (az is fizetendő)
 */
export function isCounted(expense, year, month) {
  const idx = monthIndex(year, month);
  if (expense.type === 'yearly') {
    return expense.due_year != null && monthIndex(expense.due_year, expense.due_month) === idx;
  }
  if (expense.end_year == null) return true;
  return monthIndex(expense.end_year, expense.end_month) >= idx;
}

const sum = (rows) => rows.reduce((s, r) => s + r.amount, 0);

/** Egy hónap összesítése. Minden kiadás-összeg csak a beleszámító tételekből jön (nincs dupla számlálás). */
export function summarize({ incomes, expenses, year, month }) {
  const counted = expenses.filter((e) => isCounted(e, year, month));
  const totalIncome = sum(incomes);
  const totalExpense = sum(counted);
  const categoryTotals = {};
  for (const e of counted) categoryTotals[e.category_id] = (categoryTotals[e.category_id] ?? 0) + e.amount;
  return {
    totalIncome,
    fixedIncome: sum(incomes.filter((i) => i.type === 'fixed')),
    variableIncome: sum(incomes.filter((i) => i.type === 'variable')),
    totalExpense,
    remaining: totalIncome - totalExpense,
    unpaid: sum(counted.filter((e) => !e.paid)),
    categoryTotals,
    countedIds: counted.map((e) => e.id),
  };
}

/**
 * Átlag az utolsó n hónapra (a megadott hónapot is beleértve). Ha kevesebb hónap van,
 * az összes elérhető hónap átlaga. `history`: [{year, month, value}], bármilyen sorrendben.
 */
export function averageLastN(history, year, month, n) {
  const upTo = monthIndex(year, month);
  const used = history
    .filter((h) => monthIndex(h.year, h.month) <= upTo)
    .sort((a, b) => monthIndex(b.year, b.month) - monthIndex(a.year, a.month))
    .slice(0, Math.max(1, n));
  if (used.length === 0) return { average: 0, monthsUsed: 0 };
  return { average: Math.round(sum(used.map((h) => ({ amount: h.value }))) / used.length), monthsUsed: used.length };
}

/**
 * Mely tételek másolódnak az új hónapba?
 * - fix bevételek: igen; változók: nem
 * - havi kiadások: igen, ha a lejárat még nem múlt el (a lejárattal együtt másolódnak)
 * - éves kiadások: csak ha az esedékesség az új hónap vagy később (különben az előrejelzés elveszítené őket)
 * A kifizetve jelölés mindig visszaáll.
 */
export function itemsToCopy({ incomes, expenses }, year, month) {
  const idx = monthIndex(year, month);
  return {
    incomes: incomes.filter((i) => i.type === 'fixed'),
    expenses: expenses
      .filter((e) =>
        e.type === 'yearly'
          ? e.due_year != null && monthIndex(e.due_year, e.due_month) >= idx
          : e.end_year == null || monthIndex(e.end_year, e.end_month) >= idx,
      )
      .map((e) => ({ ...e, paid: 0 })),
  };
}
