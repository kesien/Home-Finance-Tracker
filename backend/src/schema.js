// Séma-migrációk a PRAGMA user_version alapján. Új változtatás = új elem a tömb végén.
export const MIGRATIONS = [
  `
  CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
  );
  CREATE TABLE months (
    id INTEGER PRIMARY KEY,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    account_balance INTEGER NOT NULL DEFAULT 0,
    savings_balance INTEGER NOT NULL DEFAULT 0,
    UNIQUE (year, month)
  );
  CREATE TABLE incomes (
    id INTEGER PRIMARY KEY,
    month_id INTEGER NOT NULL REFERENCES months(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    type TEXT NOT NULL CHECK (type IN ('fixed', 'variable'))
  );
  CREATE TABLE expenses (
    id INTEGER PRIMARY KEY,
    month_id INTEGER NOT NULL REFERENCES months(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    type TEXT NOT NULL CHECK (type IN ('monthly', 'yearly')),
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    paid INTEGER NOT NULL DEFAULT 0 CHECK (paid IN (0, 1)),
    due_year INTEGER,   -- csak éves tételnél: esedékesség
    due_month INTEGER,
    end_year INTEGER,   -- csak havi tételnél, opcionális: utolsó fizetendő hónap
    end_month INTEGER
  );
  CREATE INDEX idx_incomes_month ON incomes(month_id);
  CREATE INDEX idx_expenses_month ON expenses(month_id);
  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  INSERT INTO settings (key, value) VALUES ('avgN', '3'), ('forecastThreshold', '0');
  INSERT INTO categories (name) VALUES
    ('Lakás'), ('Rezsi'), ('Hitel'), ('Biztosítás'), ('Adó'), ('Gyerek'),
    ('Szépségápolás'), ('Előfizetés'), ('Állat'), ('Egészség'), ('Egyéb');
  `,
  // 2. migráció: készpénz egyenleg havonta (a meglévő hónapok 0-ról indulnak)
  `ALTER TABLE months ADD COLUMN cash_balance INTEGER NOT NULL DEFAULT 0;`,
  // 3. migráció: új kiadástípus ('quarterly' – negyedéves). SQLite-ban a CHECK nem módosítható, ezért a tábla újraépül
  // (az azonosítók és minden adat megmarad; más tábla nem hivatkozik az expenses-re).
  `
  CREATE TABLE expenses_new (
    id INTEGER PRIMARY KEY,
    month_id INTEGER NOT NULL REFERENCES months(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK (amount >= 0),
    type TEXT NOT NULL CHECK (type IN ('monthly', 'quarterly', 'yearly')),
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    paid INTEGER NOT NULL DEFAULT 0 CHECK (paid IN (0, 1)),
    due_year INTEGER,   -- éves és negyedéves tételnél: esedékesség (negyedévesnél az első fizetés hónapja)
    due_month INTEGER,
    end_year INTEGER,   -- havi és negyedéves tételnél, opcionális: utolsó fizetendő hónap
    end_month INTEGER
  );
  INSERT INTO expenses_new (id, month_id, name, amount, type, category_id, paid, due_year, due_month, end_year, end_month)
    SELECT id, month_id, name, amount, type, category_id, paid, due_year, due_month, end_year, end_month FROM expenses;
  DROP TABLE expenses;
  ALTER TABLE expenses_new RENAME TO expenses;
  CREATE INDEX idx_expenses_month ON expenses(month_id);
  `,
];

export function migrate(db) {
  const current = db.pragma('user_version', { simple: true });
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
}
