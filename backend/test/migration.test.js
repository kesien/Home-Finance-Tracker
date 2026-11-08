import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { MIGRATIONS, migrate } from '../src/schema.js';

function dbAt(version) {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  for (let i = 0; i < version; i++) db.exec(MIGRATIONS[i]);
  db.pragma(`user_version = ${version}`);
  return db;
}

describe('séma-migráció', () => {
  it('az 1. verziójú adatbázis adatvesztés nélkül frissül, a készpénz 0-ról indul', () => {
    const db = dbAt(1);
    db.prepare('INSERT INTO months (year, month, account_balance, savings_balance) VALUES (2026, 10, 250000, 900000)').run();
    migrate(db);
    expect(db.pragma('user_version', { simple: true })).toBe(MIGRATIONS.length);
    expect(db.prepare('SELECT account_balance a, savings_balance s, cash_balance c FROM months').get()).toEqual({ a: 250000, s: 900000, c: 0 });
    migrate(db); // idempotens
    expect(db.prepare('SELECT COUNT(*) n FROM months').get().n).toBe(1);
  });

  it('a 2. verziójú adatbázis kiadásai (azonosítóval, kategóriával, lejárattal) megmaradnak, a negyedéves típus használható', () => {
    const db = dbAt(2);
    db.prepare('INSERT INTO months (year, month) VALUES (2026, 10)').run();
    const cat = db.prepare("SELECT id FROM categories WHERE name = 'Hitel'").get().id;
    const ins = db.prepare('INSERT INTO expenses (month_id, name, amount, type, category_id, paid, due_year, due_month, end_year, end_month) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    ins.run('CSOK hitel', 120000, 'monthly', cat, 1, null, null, 2030, 5);
    ins.run('Ingatlanadó', 60000, 'yearly', cat, 0, 2027, 3, null, null);
    migrate(db);
    const rows = db.prepare('SELECT id, name, amount, type, category_id, paid, due_year, due_month, end_year, end_month FROM expenses ORDER BY id').all();
    expect(rows).toEqual([
      { id: 1, name: 'CSOK hitel', amount: 120000, type: 'monthly', category_id: cat, paid: 1, due_year: null, due_month: null, end_year: 2030, end_month: 5 },
      { id: 2, name: 'Ingatlanadó', amount: 60000, type: 'yearly', category_id: cat, paid: 0, due_year: 2027, due_month: 3, end_year: null, end_month: null },
    ]);
    ins.run('Vízdíj', 18000, 'quarterly', cat, 0, 2026, 12, null, null); // az új típus már megengedett
    expect(() => ins.run('x', 1, 'weekly', cat, 0, null, null, null, null)).toThrow(); // a CHECK továbbra is véd
    // az index és a kapcsolatok újraépültek: a hónap törlése törli a kiadásait, a használt kategória nem törölhető
    expect(() => db.prepare('DELETE FROM categories WHERE id = ?').run(cat)).toThrow();
    db.prepare('DELETE FROM months WHERE id = 1').run();
    expect(db.prepare('SELECT COUNT(*) n FROM expenses').get().n).toBe(0);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_expenses_month'").get()).toBeTruthy();
  });
});
