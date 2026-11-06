import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { openDb } from '../src/db.js';
import { createApp } from '../src/app.js';

describe('GET /api/health', () => {
  it('ok-t ad, ha az adatbázis elérhető', async () => {
    const app = createApp({ db: openDb(':memory:') });
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: true });
  });
});
