import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { createApp } from './app.js';
import { startBackupScheduler } from './backup.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 3000);
const dbFile = process.env.DB_FILE ?? path.resolve(here, '../../data/finance.db');
const backupDir = process.env.BACKUP_DIR ?? path.resolve(here, '../../data/backups');
const staticDir = process.env.STATIC_DIR ?? path.resolve(here, '../../frontend/dist');

const db = openDb(dbFile);
const server = createApp({ db, staticDir, backupDir }).listen(port, '0.0.0.0', () =>
  console.log(`Szerver: http://0.0.0.0:${port}`),
);

const stopBackups = startBackupScheduler({ db, dir: backupDir });

// Szabályos leállítás (docker stop): szerver és DB lezárása, hogy a WAL checkpoint megtörténjen.
function shutdown() {
  stopBackups();
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
