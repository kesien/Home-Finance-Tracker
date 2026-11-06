import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createService, HttpError } from './service.js';
import { createRouter } from './routes.js';
import { createOpsRouter } from './ops.js';

export function createApp({ db, staticDir, now, backupDir }) {
  const app = express();
  // 20 MB: a teljes JSON-import is beleférjen (helyi hálózat, nincs külső elérés).
  app.use(express.json({ limit: '20mb' }));

  app.get('/api/health', (_req, res) => {
    const row = db.prepare('SELECT 1 AS ok').get();
    res.json({ status: 'ok', db: row.ok === 1 });
  });

  app.use('/api', createOpsRouter({ db, backupDir, now }));
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
    const message = err instanceof HttpError ? err.message : err.type === 'entity.too.large' ? 'A kérés túl nagy (legfeljebb 20 MB)' : status === 500 ? 'Szerverhiba' : 'Érvénytelen kérés';
    res.status(status).json({ error: message });
  });

  return app;
}
