import { summarize, averageLastN, itemsToCopy } from './logic.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const bad = (m) => new HttpError(400, m);
const notFound = (m) => new HttpError(404, m);

// ---------- validáció ----------
// Biztonságos egész + felső korlát (1000 milliárd Ft): a SQLite nagy/lebegőpontos értékeket REAL-ként tárolna.
const MAX_AMOUNT = 1e12;
const isInt = (v) => Number.isSafeInteger(v) && Math.abs(v) <= MAX_AMOUNT;
const reqBody = (b) => {
  if (b === null || typeof b !== 'object' || Array.isArray(b)) throw bad('A kérés törzse JSON objektum legyen');
  return b;
};
const reqString = (v, f) => {
  if (typeof v !== 'string' || !v.trim()) throw bad(`${f}: kötelező szöveg`);
  return v.trim();
};
const reqAmount = (v) => {
  if (!isInt(v) || v < 0) throw bad('amount: nemnegatív egész szám (Ft) kell');
  return v;
};
const reqYM = (y, m, f = '') => {
  if (!isInt(y) || y < 2000 || y > 2100 || !isInt(m) || m < 1 || m > 12) throw bad(`${f}érvénytelen év/hónap`);
};
const oneOf = (v, list, f) => {
  if (!list.includes(v)) throw bad(`${f}: ${list.join(' | ')} lehet`);
  return v;
};

export function createService(db) {
  // ---------- beállítások ----------
  const getSettings = () => {
    const s = Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map((r) => [r.key, Number(r.value)]));
    return { avgN: s.avgN, forecastThreshold: s.forecastThreshold };
  };
  function updateSettings(body) {
    reqBody(body);
    const cur = getSettings();
    const next = { ...cur, ...body };
    if (!isInt(next.avgN) || next.avgN < 1 || next.avgN > 60) throw bad('avgN: 1–60 közötti egész');
    if (!isInt(next.forecastThreshold)) throw bad('forecastThreshold: egész szám');
    const up = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
    db.transaction(() => {
      up.run('avgN', String(next.avgN));
      up.run('forecastThreshold', String(next.forecastThreshold));
    })();
    return getSettings();
  }

  // ---------- kategóriák ----------
  const listCategories = () =>
    db
      .prepare(
        `SELECT c.id, c.name, COUNT(e.id) AS itemCount
         FROM categories c LEFT JOIN expenses e ON e.category_id = c.id
         GROUP BY c.id ORDER BY c.name COLLATE NOCASE`,
      )
      .all();
  function createCategory(body) {
    const name = reqString(reqBody(body).name, 'name');
    try {
      const r = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
      return { id: Number(r.lastInsertRowid), name, itemCount: 0 };
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') throw new HttpError(409, 'Ilyen nevű kategória már van');
      throw e;
    }
  }
  function renameCategory(id, body) {
    const name = reqString(reqBody(body).name, 'name');
    try {
      const r = db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name, id);
      if (!r.changes) throw notFound('Nincs ilyen kategória');
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') throw new HttpError(409, 'Ilyen nevű kategória már van');
      throw e;
    }
    return { id, name };
  }
  function deleteCategory(id) {
    const used = db.prepare('SELECT COUNT(*) AS n FROM expenses WHERE category_id = ?').get(id).n;
    if (used) throw new HttpError(409, 'A kategóriához tartozik tétel, nem törölhető');
    if (!db.prepare('DELETE FROM categories WHERE id = ?').run(id).changes) throw notFound('Nincs ilyen kategória');
  }
  const defaultCategoryId = () => db.prepare("SELECT id FROM categories WHERE name = 'Egyéb'").get()?.id;

  // ---------- hónapok ----------
  const getMonthRow = (year, month) => db.prepare('SELECT * FROM months WHERE year = ? AND month = ?').get(year, month);
  const mustMonth = (year, month) => {
    reqYM(year, month);
    const m = getMonthRow(year, month);
    if (!m) throw notFound('Ez a hónap még nincs létrehozva');
    return m;
  };
  const incomesOf = (monthId) => db.prepare('SELECT * FROM incomes WHERE month_id = ? ORDER BY id').all(monthId);
  const expensesOf = (monthId) => db.prepare('SELECT * FROM expenses WHERE month_id = ? ORDER BY id').all(monthId);

  /** Hónaponkénti bevétel-előzmény az átlaghoz. */
  function incomeHistory() {
    return db
      .prepare(
        `SELECT m.year, m.month,
                COALESCE(SUM(i.amount), 0) AS total,
                COALESCE(SUM(CASE WHEN i.type = 'variable' THEN i.amount END), 0) AS variable
         FROM months m LEFT JOIN incomes i ON i.month_id = m.id GROUP BY m.id`,
      )
      .all();
  }

  function monthDetail(year, month) {
    const m = mustMonth(year, month);
    const incomes = incomesOf(m.id);
    const expenses = expensesOf(m.id);
    const summary = summarize({ incomes, expenses, year, month });
    const counted = new Set(summary.countedIds);
    const { avgN } = getSettings();
    const hist = incomeHistory();
    return {
      month: { id: m.id, year, month, accountBalance: m.account_balance, savingsBalance: m.savings_balance },
      incomes,
      expenses: expenses.map((e) => ({ ...e, paid: !!e.paid, counted: counted.has(e.id) })),
      summary,
      average: {
        n: avgN,
        total: averageLastN(hist.map((h) => ({ ...h, value: h.total })), year, month, avgN),
        variable: averageLastN(hist.map((h) => ({ ...h, value: h.variable })), year, month, avgN),
      },
    };
  }

  function listMonths() {
    return db
      .prepare('SELECT id, year, month, account_balance, savings_balance FROM months ORDER BY year DESC, month DESC')
      .all()
      .map((m) => {
        const s = summarize({ incomes: incomesOf(m.id), expenses: expensesOf(m.id), year: m.year, month: m.month });
        return {
          year: m.year,
          month: m.month,
          accountBalance: m.account_balance,
          savingsBalance: m.savings_balance,
          totalIncome: s.totalIncome,
          totalExpense: s.totalExpense,
          remaining: s.remaining,
        };
      });
  }

  /** Statisztikához: minden hónap (időrendben) összesítője, bevételek név szerint, kategóriaösszegek. */
  function stats() {
    const months = db.prepare('SELECT * FROM months ORDER BY year, month').all().map((m) => {
      const incomes = incomesOf(m.id);
      const sm = summarize({ incomes, expenses: expensesOf(m.id), year: m.year, month: m.month });
      return {
        year: m.year,
        month: m.month,
        totalIncome: sm.totalIncome,
        totalExpense: sm.totalExpense,
        remaining: sm.remaining,
        accountBalance: m.account_balance,
        savingsBalance: m.savings_balance,
        incomes: incomes.map((i) => ({ name: i.name, amount: i.amount })),
        categoryTotals: sm.categoryTotals,
      };
    });
    return { months, categories: listCategories().map(({ id, name }) => ({ id, name })) };
  }

  /** Új hónap; ha van korábbi hónap, annak fix tételei másolódnak (egy tranzakcióban). */
  function createMonth(body) {
    const { year, month } = reqBody(body);
    reqYM(year, month);
    if (getMonthRow(year, month)) throw new HttpError(409, 'Ez a hónap már létezik');
    return db.transaction(() => {
      const prev = db
        .prepare('SELECT * FROM months WHERE year * 12 + month < ? ORDER BY year DESC, month DESC LIMIT 1')
        .get(year * 12 + month);
      const id = Number(db.prepare('INSERT INTO months (year, month) VALUES (?, ?)').run(year, month).lastInsertRowid);
      if (prev) {
        const copy = itemsToCopy({ incomes: incomesOf(prev.id), expenses: expensesOf(prev.id) }, year, month);
        const insI = db.prepare('INSERT INTO incomes (month_id, name, amount, type) VALUES (?, ?, ?, ?)');
        const insE = db.prepare(
          `INSERT INTO expenses (month_id, name, amount, type, category_id, paid, due_year, due_month, end_year, end_month)
           VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`,
        );
        for (const i of copy.incomes) insI.run(id, i.name, i.amount, i.type);
        for (const e of copy.expenses) insE.run(id, e.name, e.amount, e.type, e.category_id, e.due_year, e.due_month, e.end_year, e.end_month);
      }
      return monthDetail(year, month);
    })();
  }

  function updateBalances(year, month, body) {
    reqBody(body);
    const m = mustMonth(year, month);
    const acc = body.accountBalance ?? m.account_balance;
    const sav = body.savingsBalance ?? m.savings_balance;
    if (!isInt(acc) || !isInt(sav)) throw bad('Az egyenleg egész szám (Ft) legyen');
    db.prepare('UPDATE months SET account_balance = ?, savings_balance = ? WHERE id = ?').run(acc, sav, m.id);
    return monthDetail(year, month);
  }

  function deleteMonth(year, month) {
    const m = mustMonth(year, month);
    db.prepare('DELETE FROM months WHERE id = ?').run(m.id);
  }

  // ---------- bevételek ----------
  function parseIncome(b) {
    reqBody(b);
    return {
      name: reqString(b.name, 'name'),
      amount: reqAmount(b.amount),
      type: oneOf(b.type ?? 'variable', ['fixed', 'variable'], 'type'),
    };
  }
  function createIncome(year, month, body) {
    const m = mustMonth(year, month);
    const i = parseIncome(body);
    const id = Number(db.prepare('INSERT INTO incomes (month_id, name, amount, type) VALUES (?, ?, ?, ?)').run(m.id, i.name, i.amount, i.type).lastInsertRowid);
    return db.prepare('SELECT * FROM incomes WHERE id = ?').get(id);
  }
  function updateIncome(id, body) {
    const cur = db.prepare('SELECT * FROM incomes WHERE id = ?').get(id);
    if (!cur) throw notFound('Nincs ilyen bevétel');
    const i = parseIncome({ ...cur, ...reqBody(body) });
    db.prepare('UPDATE incomes SET name = ?, amount = ?, type = ? WHERE id = ?').run(i.name, i.amount, i.type, id);
    return { ...cur, ...i };
  }
  function deleteIncome(id) {
    if (!db.prepare('DELETE FROM incomes WHERE id = ?').run(id).changes) throw notFound('Nincs ilyen bevétel');
  }

  // ---------- kiadások ----------
  function parseExpense(b) {
    reqBody(b);
    if (b.paid != null && typeof b.paid !== 'boolean') throw bad('paid: true/false kell');
    const type = oneOf(b.type ?? 'monthly', ['monthly', 'yearly'], 'type');
    const e = {
      name: reqString(b.name, 'name'),
      amount: reqAmount(b.amount),
      type,
      category_id: b.category_id ?? defaultCategoryId(),
      paid: b.paid ? 1 : 0,
      due_year: null, due_month: null, end_year: null, end_month: null,
    };
    if (!isInt(e.category_id) || !db.prepare('SELECT 1 FROM categories WHERE id = ?').get(e.category_id)) {
      throw bad('category_id: válassz létező kategóriát');
    }
    if (type === 'yearly') {
      reqYM(b.due_year, b.due_month, 'Esedékesség: ');
      e.due_year = b.due_year;
      e.due_month = b.due_month;
    } else if (b.end_year != null || b.end_month != null) {
      reqYM(b.end_year, b.end_month, 'Lejárat: ');
      e.end_year = b.end_year;
      e.end_month = b.end_month;
    }
    return e;
  }
  const getExpense = (id) => {
    const r = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    return r && { ...r, paid: !!r.paid };
  };
  function createExpense(year, month, body) {
    const m = mustMonth(year, month);
    const e = parseExpense(body);
    const id = Number(
      db
        .prepare(
          `INSERT INTO expenses (month_id, name, amount, type, category_id, paid, due_year, due_month, end_year, end_month)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(m.id, e.name, e.amount, e.type, e.category_id, e.paid, e.due_year, e.due_month, e.end_year, e.end_month).lastInsertRowid,
    );
    return getExpense(id);
  }
  function updateExpense(id, body) {
    const cur = getExpense(id);
    if (!cur) throw notFound('Nincs ilyen kiadás');
    reqBody(body);
    // Típusváltásnál a másik típus mezői törlődnek (parseExpense nullázza), ezért a régi mezőket csak azonos típusnál örökítjük.
    const base = body.type && body.type !== cur.type ? { name: cur.name, amount: cur.amount, category_id: cur.category_id, paid: cur.paid } : cur;
    const e = parseExpense({ ...base, ...body });
    db.prepare(
      `UPDATE expenses SET name=?, amount=?, type=?, category_id=?, paid=?, due_year=?, due_month=?, end_year=?, end_month=? WHERE id=?`,
    ).run(e.name, e.amount, e.type, e.category_id, e.paid, e.due_year, e.due_month, e.end_year, e.end_month, id);
    return getExpense(id);
  }
  function deleteExpense(id) {
    if (!db.prepare('DELETE FROM expenses WHERE id = ?').run(id).changes) throw notFound('Nincs ilyen kiadás');
  }

  return {
    getSettings, updateSettings,
    listCategories, createCategory, renameCategory, deleteCategory,
    stats, listMonths, monthDetail, createMonth, updateBalances, deleteMonth,
    createIncome, updateIncome, deleteIncome,
    createExpense, updateExpense, deleteExpense,
  };
}
