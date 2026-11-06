import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';
import { createDailyBackup, createPreImportBackup, listBackups, pruneBackups, dayStamp, startBackupScheduler } from '../src/backup.js';

let db, dir, api;
const NOW = new Date(2026, 10, 15, 10, 0, 0);
beforeEach(() => {
  db = openDb(':memory:');
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bk-'));
  api = request(createApp({ db, backupDir: dir, now: () => NOW }));
});
afterEach(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });

async function seed() {
  await api.post('/api/months').send({ year: 2026, month: 10 });
  const cats = (await api.get('/api/categories')).body;
  const hitel = cats.find((c) => c.name === 'Hitel').id;
  await api.post('/api/months/2026/10/incomes').send({ name: 'Apa fizu', amount: 832000, type: 'fixed' });
  await api.post('/api/months/2026/10/incomes').send({ name: 'Prémium', amount: 50000, type: 'variable' });
  await api.post('/api/months/2026/10/expenses').send({ name: 'CSOK hitel', amount: 120000, category_id: hitel, end_year: 2030, end_month: 5, paid: true });
  await api.post('/api/months/2026/10/expenses').send({ name: 'Adó', amount: 60000, type: 'yearly', due_year: 2027, due_month: 3 });
  await api.patch('/api/months/2026/10').send({ accountBalance: 250000, savingsBalance: 900000 });
  await api.post('/api/months').send({ year: 2026, month: 11 });
  await api.put('/api/settings').send({ avgN: 5, forecastThreshold: -10000 });
}

describe('mentések', () => {
  it('naponta egy mentés készül, a másodikat kihagyja, a fájl valódi SQLite adatbázis', async () => {
    await api.post('/api/months').send({ year: 2026, month: 10 });
    expect(await createDailyBackup(db, dir, NOW)).toBe('finance-2026-11-15.db');
    expect(await createDailyBackup(db, dir, NOW)).toBeNull();
    const copy = openDb(path.join(dir, 'finance-2026-11-15.db'));
    expect(copy.prepare('SELECT COUNT(*) AS n FROM months').get().n).toBe(1);
    copy.close();
    expect(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp'))).toEqual([]);
  });

  it('csak az utolsó 30 napi mentést őrzi meg (a legrégebbi törlődik)', async () => {
    for (let d = 0; d < 35; d++) await createDailyBackup(db, dir, new Date(2026, 8, 1 + d));
    const names = listBackups(dir).map((b) => b.name);
    expect(names).toHaveLength(30);
    expect(names).not.toContain(`finance-${dayStamp(new Date(2026, 8, 1))}.db`);
    expect(names[0]).toBe(`finance-${dayStamp(new Date(2026, 8, 35))}.db`);
  });

  it('az import előtti mentések külön számolnak és nem szorítják ki a napiakat', async () => {
    for (let d = 0; d < 30; d++) await createDailyBackup(db, dir, new Date(2026, 8, 1 + d));
    for (let i = 0; i < 7; i++) await createPreImportBackup(db, dir, new Date(2026, 10, 1, 10, 0, i));
    const list = listBackups(dir);
    expect(list.filter((b) => b.kind === 'daily')).toHaveLength(30);
    expect(list.filter((b) => b.kind === 'pre-import')).toHaveLength(5);
  });

  it('prune nem nyúl idegen fájlokhoz', () => {
    fs.writeFileSync(path.join(dir, 'jegyzet.txt'), 'x');
    pruneBackups(dir, 0, 0);
    expect(fs.existsSync(path.join(dir, 'jegyzet.txt'))).toBe(true);
  });

  it('az ütemező induláskor pótolja a mai mentést', async () => {
    const stop = startBackupScheduler({ db, dir, now: () => NOW, intervalMs: 1e9, log: { log() {}, error() {} } });
    await new Promise((r) => setTimeout(r, 100));
    stop();
    expect(listBackups(dir).map((b) => b.name)).toEqual(['finance-2026-11-15.db']);
  });

  it('API: kézi mentés és lista', async () => {
    const r = await api.post('/api/backups');
    expect(r.status).toBe(201);
    expect((await api.get('/api/backups')).body.map((b) => b.name)).toEqual(['finance-2026-11-15.db']);
  });
});

describe('export / import', () => {
  it('az export után a teljes adat visszaállítható (körbejárás), azonos eredménnyel', async () => {
    await seed();
    const before = (await api.get('/api/export')).body;
    const stats = (await api.get('/api/stats')).body;
    // üres adatbázisba importálunk, mintha új gépre állítanánk vissza
    const db2 = openDb(':memory:');
    const api2 = request(createApp({ db: db2, now: () => NOW }));
    const res = await api2.post('/api/import').send(before);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ months: 2 });
    const after = (await api2.get('/api/export')).body;
    expect({ ...after, exportedAt: 0 }).toEqual({ ...before, exportedAt: 0 });
    expect((await api2.get('/api/stats')).body).toEqual(stats);
    expect((await api2.get('/api/settings')).body).toEqual({ avgN: 5, forecastThreshold: -10000 });
    // a kategória-hivatkozás és a lejárat megmaradt
    const okt = (await api2.get('/api/months/2026/10')).body;
    const hitel = okt.expenses.find((e) => e.name === 'CSOK hitel');
    expect([hitel.end_year, hitel.end_month, hitel.paid]).toEqual([2030, 5, true]);
    db2.close();
  });

  it('az import felülírja a meglévő adatot, és előtte mentést készít', async () => {
    await seed();
    const exported = (await api.get('/api/export')).body;
    await api.post('/api/months').send({ year: 2027, month: 1 });
    const res = await api.post('/api/import').send(exported);
    expect(res.status).toBe(200);
    expect(res.body.backup).toMatch(/^finance-pre-import-/);
    expect((await api.get('/api/months')).body.map((m) => m.month)).toEqual([11, 10]);
    expect(fs.existsSync(path.join(dir, res.body.backup))).toBe(true);
  });

  it('érvénytelen import 400, az adat és a mentések érintetlenek', async () => {
    await seed();
    const exported = (await api.get('/api/export')).body;
    const broken = structuredClone(exported);
    broken.months[0].expenses[0].amount = 1.5;
    const bad = [
      broken,
      { ...exported, version: 2 },
      { ...exported, format: 'más' },
      { ...exported, months: [exported.months[0], exported.months[0]] },
      { ...exported, categories: ['Hitel', 'hitel'] },
      null,
    ];
    for (const b of bad) {
      const r = await api.post('/api/import').set('Content-Type', 'application/json').send(JSON.stringify(b));
      expect(r.status, JSON.stringify(b)?.slice(0, 60)).toBe(400);
      expect(r.body.error).toBeTruthy();
    }
    expect((await api.get('/api/months')).body).toHaveLength(2);
    expect(listBackups(dir)).toHaveLength(0);
  });

  it('import közben fellépő hiba esetén a régi adat megmarad (tranzakció)', async () => {
    await seed();
    const exported = (await api.get('/api/export')).body;
    // az ellenőrzést átmegy, de a beszúrás közben hiba lép fel (trigger szimulálja): a törlés is vissza kell, hogy guruljon
    const sneaky = structuredClone(exported);
    sneaky.months[1].accountBalance = 5;
    db.exec("CREATE TRIGGER boom BEFORE INSERT ON incomes BEGIN SELECT RAISE(ABORT, 'boom'); END;");
    const r = await api.post('/api/import').send(sneaky);
    expect(r.status).toBe(500);
    db.exec('DROP TRIGGER boom');
    expect((await api.get('/api/months')).body).toHaveLength(2);
    expect((await api.get('/api/months/2026/10')).body.incomes).toHaveLength(2);
  });

  it('az Egyéb kategória import után is létezik; nagy törzs (>100 kB) is átmegy', async () => {
    const big = { format: 'haztartasi-koltsegkovet', version: 1, categories: ['Lakás'], months: [{ year: 2026, month: 1, incomes: Array.from({ length: 3000 }, (_, i) => ({ name: `Bevétel ${i} ${'x'.repeat(30)}`, amount: 1, type: 'variable' })), expenses: [] }] };
    const r = await api.post('/api/import').send(big);
    expect(r.status).toBe(200);
    expect((await api.get('/api/categories')).body.map((c) => c.name)).toContain('Egyéb');
    expect((await api.get('/api/months/2026/1')).body.incomes).toHaveLength(3000);
  });

  it('az export letöltésként érkezik', async () => {
    const r = await api.get('/api/export');
    expect(r.headers['content-disposition']).toContain('koltsegkovet-2026-11-15.json');
  });
});
