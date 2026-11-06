import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { openDb } from './db.js';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const dbFile = process.env.DB_FILE ?? path.resolve('data/finance.db');
const staticDir =
  process.env.STATIC_DIR ??
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');

const db = openDb(dbFile);
const app = createApp({ db });

// Production: a buildelt frontendet ugyanaz a szerver szolgálja ki (SPA fallback).
if (fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(staticDir, 'index.html')));
}

app.listen(port, '0.0.0.0', () => console.log(`Szerver: http://0.0.0.0:${port}`));
