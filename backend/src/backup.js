import fs from 'node:fs';
import path from 'node:path';

const DAILY = /^finance-(\d{4}-\d{2}-\d{2})\.db$/;
const PRE_IMPORT = /^finance-pre-import-\d{8}-\d{6}\.db$/;

const pad = (n) => String(n).padStart(2, '0');
export const dayStamp = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const timeStamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;

/**
 * Konzisztens másolat az élő SQLite fájlról (better-sqlite3 backup API, WAL mellett is biztonságos).
 * Előbb ideiglenes fájlba ír, és csak kész állapotban nevezi át, így félkész mentés sosem marad a könyvtárban.
 */
async function writeBackup(db, dir, finalName) {
  fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, `.${finalName}.tmp`);
  await db.backup(tmp);
  fs.renameSync(tmp, path.join(dir, finalName));
  return finalName;
}

/** Napi mentés; ha mára már van, nem készít újat (visszatérés: null). */
export async function createDailyBackup(db, dir, now = new Date(), keep = 30) {
  const name = `finance-${dayStamp(now)}.db`;
  if (fs.existsSync(path.join(dir, name))) return null;
  await writeBackup(db, dir, name);
  pruneBackups(dir, keep);
  return name;
}

/** Importálás előtti biztonsági mentés (mindig új fájl; az utolsó néhányat őrizzük meg). */
export async function createPreImportBackup(db, dir, now = new Date()) {
  const name = await writeBackup(db, dir, `finance-pre-import-${timeStamp(now)}.db`);
  pruneBackups(dir, 30, 5);
  return name;
}

/** Kézi mentés a Beállításokból: ugyanaz, mint a napi, de ha már van mai, felülírja azt a frissebbel. */
export async function createManualBackup(db, dir, now = new Date(), keep = 30) {
  const name = `finance-${dayStamp(now)}.db`;
  await writeBackup(db, dir, name);
  pruneBackups(dir, keep);
  return name;
}

export function listBackups(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => DAILY.test(f) || PRE_IMPORT.test(f))
    .map((f) => {
      const st = fs.statSync(path.join(dir, f));
      return { name: f, size: st.size, modified: st.mtime.toISOString(), kind: DAILY.test(f) ? 'daily' : 'pre-import' };
    })
    .sort((a, b) => b.name.localeCompare(a.name));
}

/** A napi mentésekből a legutolsó `keepDaily`, az import előttiekből a legutolsó `keepPre` marad (név szerint rendezve = időrend). */
export function pruneBackups(dir, keepDaily = 30, keepPre = 5) {
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const drop = (re, keep) => files.filter((f) => re.test(f)).sort().reverse().slice(keep).forEach((f) => fs.rmSync(path.join(dir, f), { force: true }));
  drop(DAILY, keepDaily);
  drop(PRE_IMPORT, keepPre);
}

/**
 * Naponta egy mentés: induláskor és óránként ellenőrzi, van-e már mai. (Így az újraindított / éjjel kikapcsolt
 * szerver is pótolja a kimaradt napot.) Hibát naplóz, de nem állítja le az appot.
 */
export function startBackupScheduler({ db, dir, keep = 30, intervalMs = 60 * 60 * 1000, now = () => new Date(), log = console }) {
  const tick = () => createDailyBackup(db, dir, now(), keep).then((n) => n && log.log(`Mentés készült: ${n}`)).catch((e) => log.error('Mentés sikertelen:', e));
  tick();
  const timer = setInterval(tick, intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
