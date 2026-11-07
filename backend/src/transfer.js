// Teljes adatbázis JSON export / import. Az import atomikus: vagy minden bekerül, vagy semmi.
import { HttpError } from './service.js';

const MAX = 1e12;
const isInt = (v) => Number.isSafeInteger(v) && Math.abs(v) <= MAX;
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const bad = (m) => new HttpError(400, `Érvénytelen import: ${m}`);

export function exportAll(db) {
  const settings = Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map((r) => [r.key, Number(r.value)]));
  const categories = db.prepare('SELECT name FROM categories ORDER BY id').all().map((c) => c.name);
  const months = db.prepare('SELECT * FROM months ORDER BY year, month').all().map((m) => ({
    year: m.year,
    month: m.month,
    accountBalance: m.account_balance,
    savingsBalance: m.savings_balance,
    cashBalance: m.cash_balance,
    incomes: db.prepare('SELECT name, amount, type FROM incomes WHERE month_id = ? ORDER BY id').all(m.id),
    expenses: db
      .prepare(
        `SELECT e.name, e.amount, e.type, c.name AS category, e.paid, e.due_year AS dueYear, e.due_month AS dueMonth,
                e.end_year AS endYear, e.end_month AS endMonth
         FROM expenses e JOIN categories c ON c.id = e.category_id WHERE e.month_id = ? ORDER BY e.id`,
      )
      .all(m.id)
      .map((e) => ({ ...e, paid: !!e.paid })),
  }));
  return { format: 'haztartasi-koltsegkovet', version: 1, exportedAt: new Date().toISOString(), settings, categories, months };
}

const str = (v, f) => {
  if (typeof v !== 'string' || !v.trim()) throw bad(`${f}: kötelező szöveg`);
  return v.trim();
};
const ym = (y, m, f) => {
  if (!Number.isInteger(y) || y < 2000 || y > 2100 || !Number.isInteger(m) || m < 1 || m > 12) throw bad(`${f}: érvénytelen év/hónap`);
};

/** Teljes ellenőrzés még az adatbázis érintése előtt; a visszatérési érték a normalizált adat. */
export function validateImport(data) {
  if (data === null || typeof data !== 'object' || data.format !== 'haztartasi-koltsegkovet') throw bad('nem ennek az alkalmazásnak az exportja');
  if (data.version !== 1) throw bad(`nem támogatott verzió: ${data.version}`);
  if (!Array.isArray(data.categories) || !Array.isArray(data.months)) throw bad('hiányzó categories / months');

  if (data.settings !== undefined && !isObj(data.settings)) throw bad('settings: objektum kell');
  const s = data.settings ?? {};
  const avgN = s.avgN ?? 3;
  const threshold = s.forecastThreshold ?? 0;
  if (!Number.isInteger(avgN) || avgN < 1 || avgN > 60) throw bad('settings.avgN: 1–60');
  if (!isInt(threshold)) throw bad('settings.forecastThreshold: egész szám');

  const categories = [];
  const seen = new Set();
  for (const c of data.categories) {
    const name = str(c, 'kategória');
    if (seen.has(name.toLowerCase())) throw bad(`ismétlődő kategória: ${name}`);
    seen.add(name.toLowerCase());
    categories.push(name);
  }
  if (!seen.has('egyéb')) categories.push('Egyéb'); // a fallback kategória mindig kell

  const monthKeys = new Set();
  const months = data.months.map((m, i) => {
    const at = `months[${i}]`;
    if (!isObj(m)) throw bad(`${at}: objektum kell`);
    ym(m.year, m.month, at);
    const key = `${m.year}-${m.month}`;
    if (monthKeys.has(key)) throw bad(`${at}: ismétlődő hónap (${key})`);
    monthKeys.add(key);
    if (!isInt(m.accountBalance ?? 0) || !isInt(m.savingsBalance ?? 0) || !isInt(m.cashBalance ?? 0)) throw bad(`${at}: az egyenleg egész szám`);
    if (!Array.isArray(m.incomes) || !Array.isArray(m.expenses)) throw bad(`${at}: hiányzó incomes / expenses`);
    const incomes = m.incomes.map((x, j) => {
      if (!isObj(x)) throw bad(`${at}.incomes[${j}]: objektum kell`);
      if (!isInt(x.amount) || x.amount < 0) throw bad(`${at}.incomes[${j}]: amount`);
      if (!['fixed', 'variable'].includes(x.type)) throw bad(`${at}.incomes[${j}]: type`);
      return { name: str(x.name, `${at}.incomes[${j}].name`), amount: x.amount, type: x.type };
    });
    const expenses = m.expenses.map((x, j) => {
      const f = `${at}.expenses[${j}]`;
      if (!isObj(x)) throw bad(`${f}: objektum kell`);
      if (!isInt(x.amount) || x.amount < 0) throw bad(`${f}: amount`);
      if (!['monthly', 'yearly'].includes(x.type)) throw bad(`${f}: type`);
      const category = str(x.category, `${f}.category`);
      if (!seen.has(category.toLowerCase()) && category.toLowerCase() !== 'egyéb') throw bad(`${f}: ismeretlen kategória (${category})`);
      const e = { name: str(x.name, `${f}.name`), amount: x.amount, type: x.type, category, paid: x.paid === true, dueYear: null, dueMonth: null, endYear: null, endMonth: null };
      if (x.type === 'yearly') {
        ym(x.dueYear, x.dueMonth, `${f} esedékesség`);
        Object.assign(e, { dueYear: x.dueYear, dueMonth: x.dueMonth });
      } else if (x.endYear != null || x.endMonth != null) {
        ym(x.endYear, x.endMonth, `${f} lejárat`);
        Object.assign(e, { endYear: x.endYear, endMonth: x.endMonth });
      }
      return e;
    });
    return { year: m.year, month: m.month, accountBalance: m.accountBalance ?? 0, savingsBalance: m.savingsBalance ?? 0, cashBalance: m.cashBalance ?? 0, incomes, expenses };
  });
  return { settings: { avgN, forecastThreshold: threshold }, categories, months };
}

/** A teljes tartalom cseréje egyetlen tranzakcióban (hiba esetén a régi adat érintetlen marad). */
export function importAll(db, data) {
  return applyImport(db, validateImport(data));
}

export function applyImport(db, v) {
  db.transaction(() => {
    db.exec('DELETE FROM expenses; DELETE FROM incomes; DELETE FROM months; DELETE FROM categories;');
    const catId = new Map();
    const insC = db.prepare('INSERT INTO categories (name) VALUES (?)');
    for (const name of v.categories) catId.set(name.toLowerCase(), Number(insC.run(name).lastInsertRowid));
    const insM = db.prepare('INSERT INTO months (year, month, account_balance, savings_balance, cash_balance) VALUES (?, ?, ?, ?, ?)');
    const insI = db.prepare('INSERT INTO incomes (month_id, name, amount, type) VALUES (?, ?, ?, ?)');
    const insE = db.prepare(
      `INSERT INTO expenses (month_id, name, amount, type, category_id, paid, due_year, due_month, end_year, end_month)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    for (const m of v.months) {
      const id = Number(insM.run(m.year, m.month, m.accountBalance, m.savingsBalance, m.cashBalance).lastInsertRowid);
      for (const i of m.incomes) insI.run(id, i.name, i.amount, i.type);
      for (const e of m.expenses) insE.run(id, e.name, e.amount, e.type, catId.get(e.category.toLowerCase()), e.paid ? 1 : 0, e.dueYear, e.dueMonth, e.endYear, e.endMonth);
    }
    const up = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    up.run('avgN', String(v.settings.avgN));
    up.run('forecastThreshold', String(v.settings.forecastThreshold));
  })();
  return { months: v.months.length, categories: v.categories.length };
}
