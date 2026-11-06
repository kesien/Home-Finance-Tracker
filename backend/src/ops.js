import { Router } from 'express';
import { exportAll, validateImport, applyImport } from './transfer.js';
import { createManualBackup, createPreImportBackup, listBackups } from './backup.js';
import { HttpError } from './service.js';

/** Üzemeltetési végpontok: export, import, mentések. `backupDir` nélkül a mentések tiltottak. */
// Express 4 nem kapja el az async kezelők hibáit, ezért továbbítjuk a hibakezelőnek.
const wrap = (fn) => (q, res, next) => Promise.resolve(fn(q, res)).catch(next);

export function createOpsRouter({ db, backupDir, now = () => new Date() }) {
  const r = Router();

  r.get('/export', (_q, res) => {
    const stamp = now().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="koltsegkovet-${stamp}.json"`);
    res.json(exportAll(db));
  });

  r.post('/import', wrap(async (q, res) => {
    // Előbb teljes ellenőrzés (érvénytelen fájlnál ne készüljön felesleges mentés), aztán biztonsági mentés, aztán csere.
    const valid = validateImport(q.body);
    let backup = null;
    if (backupDir) backup = await createPreImportBackup(db, backupDir, now());
    const result = applyImport(db, valid);
    res.json({ ...result, backup });
  }));

  r.get('/backups', (_q, res) => res.json(backupDir ? listBackups(backupDir) : []));
  r.post('/backups', wrap(async (_q, res) => {
    if (!backupDir) throw new HttpError(404, 'A mentés nincs beállítva');
    const name = await createManualBackup(db, backupDir, now());
    res.status(201).json({ name, backups: listBackups(backupDir) });
  }));

  return r;
}
