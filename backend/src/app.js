import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createService } from './service.js';
import { createRouter } from './routes.js';

export function createApp({ db, staticDir, now }) {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    const row = db.prepare('SELECT 1 AS ok').get();
    res.json({ status: 'ok', db: row.ok === 1 });
  });

  app.use('/api', createRouter(createService(db), now));

  // Ismeretlen /api útvonal mindig JSON 404, sosem az SPA index.html.
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Nem található' }));

  // Production: a buildelt frontendet ugyanaz a szerver szolgálja ki (SPA fallback).
  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get('*', (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }

  // Hibás JSON / túl nagy törzs stb.: mindig JSON válasz, stack trace nélkül.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const status = err.status >= 400 && err.status < 500 ? err.status : 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: status === 500 ? 'Szerverhiba' : 'Érvénytelen kérés' });
  });

  return app;
}
