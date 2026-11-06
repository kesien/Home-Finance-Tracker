import { describe, it, expect, afterEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';

const dbs = [];
function memDb() {
  const db = openDb(':memory:');
  dbs.push(db);
  return db;
}
afterEach(() => dbs.splice(0).forEach((d) => d.close()));

describe('API', () => {
  it('health ok-t ad, ha az adatbázis elérhető', async () => {
    const res = await request(createApp({ db: memDb() })).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: true });
  });

  it('ismeretlen /api útvonal JSON 404, statikus fájlok mellett is', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'static-'));
    fs.writeFileSync(path.join(dir, 'index.html'), '<html>spa</html>');
    const app = createApp({ db: memDb(), staticDir: dir });
    const api = await request(app).get('/api/nincs');
    expect(api.status).toBe(404);
    expect(api.body.error).toBeTruthy();
    const page = await request(app).get('/honapok/2026-11');
    expect(page.status).toBe(200);
    expect(page.text).toContain('spa');
  });
});
