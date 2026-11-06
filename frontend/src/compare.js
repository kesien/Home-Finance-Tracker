/**
 * Két hónap összehasonlítása. `a` és `b` a /api/months/:év/:hó válasz.
 * A különbség mindig b − a. Kategóriánként az összes olyan kategória szerepel, amelyik valamelyik hónapban számít.
 */
export function compareMonths(a, b, categories) {
  const diff = (x, y) => y - x;
  const names = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  const ids = new Set([...Object.keys(a.summary.categoryTotals), ...Object.keys(b.summary.categoryTotals)]);
  const categoryRows = [...ids]
    .map((id) => {
      const av = a.summary.categoryTotals[id] ?? 0;
      const bv = b.summary.categoryTotals[id] ?? 0;
      return { id: Number(id), name: names[id] ?? '?', a: av, b: bv, diff: diff(av, bv) };
    })
    .sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff) || y.b - x.b);
  const row = (label, av, bv, goodWhenUp) => ({ label, a: av, b: bv, diff: diff(av, bv), goodWhenUp });
  return {
    totals: [
      row('Bevétel', a.summary.totalIncome, b.summary.totalIncome, true),
      row('Kiadás', a.summary.totalExpense, b.summary.totalExpense, false),
      row('Fennmaradó', a.summary.remaining, b.summary.remaining, true),
      row('Számlán', a.month.accountBalance, b.month.accountBalance, true),
      row('Megtakarítás', a.month.savingsBalance, b.month.savingsBalance, true),
    ],
    categories: categoryRows,
  };
}
