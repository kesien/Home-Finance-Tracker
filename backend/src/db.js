import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

/** SQLite kapcsolat megnyitása. ':memory:' esetén nem hoz létre könyvtárat. */
export function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  // WAL: egyidejű olvasás írás közben; a foreign key-ek SQLite-ban alapból kikapcsoltak.
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}
