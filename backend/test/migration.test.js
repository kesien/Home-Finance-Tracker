import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { MIGRATIONS, migrate } from '../src/schema.js';

describe('séma-migráció', () => {
  it('a meglévő (1. verziójú) adatbázis adatvesztés nélkül frissül, a készpénz 0-ról indul', () => {
    const db = new Database(':memory:');
    db.exec(MIGRATIONS[0]);
    db.pragma('user_version = 1');
    db.prepare('INSERT INTO months (year, month, account_balance, savings_balance) VALUES (2026, 10, 250000, 900000)').run();
    migrate(db);
    expect(db.pragma('user_version', { simple: true })).toBe(MIGRATIONS.length);
    expect(db.prepare('SELECT account_balance a, savings_balance s, cash_balance c FROM months').get()).toEqual({ a: 250000, s: 900000, c: 0 });
    migrate(db); // idempotens
    expect(db.prepare('SELECT COUNT(*) n FROM months').get().n).toBe(1);
  });
});
