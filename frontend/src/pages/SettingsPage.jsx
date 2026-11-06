import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { parseSigned } from '../format.js';

const fmtDate = (iso) => new Date(iso).toLocaleString('hu-HU');
const fmtSize = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} kB`);

export default function SettingsPage() {
  const [avgN, setAvgN] = useState('3');
  const [threshold, setThreshold] = useState('0');
  const [backups, setBackups] = useState([]);
  const [msg, setMsg] = useState(null); // {kind:'ok'|'error', text}
  const [loaded, setLoaded] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [s, b] = await Promise.all([api.get('/settings'), api.get('/backups')]);
      setAvgN(String(s.avgN));
      setThreshold(String(s.forecastThreshold));
      setBackups(b);
      setLoaded(true);
    } catch (e) {
      setMsg({ kind: 'error', text: e.message });
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const ok = (text) => setMsg({ kind: 'ok', text });
  const fail = (text) => setMsg({ kind: 'error', text });

  async function saveSettings(e) {
    e.preventDefault();
    const n = Number(avgN);
    const t = parseSigned(threshold);
    if (!Number.isInteger(n) || n < 1 || n > 60) return fail('Az átlag hónapjainak száma 1 és 60 közötti egész legyen');
    if (t === null) return fail('A küszöb egész szám legyen (Ft)');
    try {
      await api.put('/settings', { avgN: n, forecastThreshold: t });
      ok('Beállítások elmentve.');
      load();
    } catch (err) {
      fail(err.message);
    }
  }

  async function backupNow() {
    try {
      await api.post('/backups');
      ok('Mentés elkészült.');
      load();
    } catch (err) {
      fail(err.message);
    }
  }

  async function importFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // ugyanaz a fájl újra is választható legyen
    if (!file) return;
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch {
      return fail('A fájl nem érvényes JSON.');
    }
    const months = Array.isArray(data?.months) ? data.months.length : '?';
    const empty = months === 0 ? '\n\nA fájl NEM tartalmaz hónapot: az import minden jelenlegi adatot töröl!' : '';
    if (!confirm(`FIGYELEM: az import az ÖSSZES jelenlegi adatot lecseréli a fájl tartalmára (${months} hónap). Előtte biztonsági mentés készül. Folytatod?${empty}`)) return;
    try {
      const r = await api.post('/import', data);
      ok(`Import kész: ${r.months} hónap, ${r.categories} kategória. Biztonsági mentés: ${r.backup ?? 'nincs'}.`);
      load();
    } catch (err) {
      fail(err.message);
    }
  }

  // Az űrlapot csak betöltött értékekkel jelenítjük meg: különben az alapértékek felülírhatnák a valódi beállításokat.
  if (!loaded) {
    return (
      <>
        <h1>Beállítások</h1>
        {msg ? <p className="warn" role="alert">{msg.text} <button className="btn" onClick={() => { setMsg(null); load(); }}>Újra</button></p> : <p className="muted">Betöltés…</p>}
      </>
    );
  }

  return (
    <>
      <h1>Beállítások</h1>
      {msg && <p className={msg.kind === 'ok' ? 'okbar' : 'warn'} role={msg.kind === 'ok' ? 'status' : 'alert'}>{msg.text}</p>}

      <section>
        <h2>Számítások</h2>
        <form className="form card" onSubmit={saveSettings}>
          <label>Bevétel-átlag: hány hónapot vegyen figyelembe (N)
            <input inputMode="numeric" value={avgN} onChange={(e) => setAvgN(e.target.value)} />
          </label>
          <label>Előrejelzés figyelmeztetési küszöbe (Ft)
            <input inputMode="text" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </label>
          <p className="muted small">Ha kevesebb hónap van, az összes elérhető hónap átlaga számít. Az egyenleg a küszöb alá esésekor az Előrejelzés oldal figyelmeztet.</p>
          <div className="actions"><button className="btn primary">Mentés</button></div>
        </form>
      </section>

      <section>
        <h2>Mentés és visszaállítás</h2>
        <div className="card form">
          <p className="muted small">Az app naponta automatikusan menti az adatbázist (az utolsó 30 napi mentést őrzi meg). A teljes adatot JSON-ként is le lehet tölteni, és vissza lehet tölteni.</p>
          <div className="row">
            <a className="btn link" href="/api/export" download>JSON export letöltése</a>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>JSON import…</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} aria-label="Import fájl kiválasztása" />
          </div>
          <p className="small neg">Az import minden jelenlegi adatot lecserél (előtte automatikus biztonsági mentés készül).</p>
        </div>
      </section>

      <section>
        <div className="section-head"><h2>Automatikus mentések</h2><button className="btn" onClick={backupNow}>Mentés most</button></div>
        <ul className="list">
          {backups.map((b) => (
            <li key={b.name} className="item">
              <span className="grow"><span>{b.name}</span><span className="muted small block">{fmtDate(b.modified)}{b.kind === 'pre-import' ? ' · import előtti' : ''}</span></span>
              <span className="muted small">{fmtSize(b.size)}</span>
            </li>
          ))}
          {backups.length === 0 && <li className="item muted">Még nincs mentés.</li>}
        </ul>
        <p className="muted small">A mentések a szerveren, a <code>/data/backups</code> könyvtárban vannak (lásd README: visszaállítás).</p>
      </section>
    </>
  );
}
