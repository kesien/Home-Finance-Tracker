import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { createService } from './service.js';
import { createRouter } from './routes.js';

export function createApp({ db, staticDir }) {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    const row = db.prepare('SELECT 1 AS ok').get();
    res.json({ status: 'ok', db: row.ok === 1 });
  });

  app.use('/api', createRouter(createService(db)));

  // Ismeretlen /api útvonal mindig JSON 404, sosem az SPA index.html.
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Nem található' }));

  // Production: a buildelt frontendet ugyanaz a szerver szolgálja ki (SPA fallback).
  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get('*', (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
  }

  return app;
}
