import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { formatMoney, monthLabel, shiftMonth, MONTH_NAMES, categoryColor } from '../format.js';
import { compareMonths } from '../compare.js';

const key = (m) => `${m.year}-${m.month}`;
const signClass = (n) => (n < 0 ? 'neg' : n > 0 ? 'pos' : '');

function Compare({ months }) {
  const [a, setA] = useState(months[1] ? key(months[1]) : key(months[0]));
  const [b, setB] = useState(key(months[0]));
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stale = false;
    const [ay, am] = a.split('-');
    const [by, bm] = b.split('-');
    Promise.all([api.get(`/months/${ay}/${am}`), api.get(`/months/${by}/${bm}`), api.get('/categories')])
      .then(([da, db, cats]) => !stale && (setResult(compareMonths(da, db, cats)), setError('')))
      .catch((e) => !stale && setError(e.message));
    return () => { stale = true; };
  }, [a, b]);

  const select = (value, set, label) => (
    <label className="grow">{label}
      <select value={value} onChange={(e) => set(e.target.value)}>
        {months.map((m) => <option key={key(m)} value={key(m)}>{monthLabel(m.year, m.month)}</option>)}
      </select>
    </label>
  );
  // Zöld, ha a változás kedvező (több bevétel/egyenleg, kevesebb kiadás).
  const cls = (d, goodWhenUp) => (d === 0 ? 'muted' : (d > 0) === goodWhenUp ? 'pos' : 'neg');
  const signed = (d) => (d > 0 ? '+' : '') + formatMoney(d);

  return (
    <section>
      <h2>Összehasonlítás</h2>
      <div className="row compare-pick form">{select(a, setA, 'Alap')}{select(b, setB, 'Összevetett')}</div>
      {error && <p className="error" role="alert">{error}</p>}
      {result && (
        <>
          <ul className="list">
            {result.totals.map((t) => (
              <li key={t.label} className="item cmp">
                <span className="grow">{t.label}</span>
                <span className="muted num">{formatMoney(t.a)}</span>
                <span className="num">{formatMoney(t.b)}</span>
                <strong className={`num ${cls(t.diff, t.goodWhenUp)}`}>{signed(t.diff)}</strong>
              </li>
            ))}
          </ul>
          <h2 className="gap">Kategóriák</h2>
          <ul className="list">
            {result.categories.map((c) => (
              <li key={c.id} className="item cmp">
                <span className="grow"><span className="dot" style={{ background: categoryColor(c.id) }} />{c.name}</span>
                <span className="muted num">{formatMoney(c.a)}</span>
                <span className="num">{formatMoney(c.b)}</span>
                <strong className={`num ${cls(c.diff, false)}`}>{signed(c.diff)}</strong>
              </li>
            ))}
            {result.categories.length === 0 && <li className="item muted">Nincs kiadás egyik hónapban sem.</li>}
          </ul>
        </>
      )}
    </section>
  );
}

export default function MonthsPage() {
  const navigate = useNavigate();
  const [months, setMonths] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [target, setTarget] = useState(null); // {year, month} az új hónaphoz

  const load = useCallback(() => api.get('/months').then((m) => {
    setMonths(m);
    // Alapértelmezett új hónap: a legutolsó utáni, vagy a mostani, ha még nincs hónap.
    const now = new Date();
    setTarget(m.length ? shiftMonth(m[0].year, m[0].month, 1) : { year: now.getFullYear(), month: now.getMonth() + 1 });
  }).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/months', target);
      navigate(`/honap/${target.year}/${target.month}`);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  if (!months) return <>{error ? <p className="error" role="alert">{error}</p> : <p className="muted">Betöltés…</p>}</>;
  const exists = target && months.some((m) => m.year === target.year && m.month === target.month);

  return (
    <>
      <h1>Hónapok</h1>
      <section>
        <h2>Új hónap</h2>
        <p className="muted small">Az előző hónap fix tételei (a lejárati dátumukkal) átmásolódnak, a változók üresen indulnak.</p>
        <div className="row form">
          <input type="number" aria-label="Év" value={target.year} onChange={(e) => setTarget({ ...target, year: Number(e.target.value) })} />
          <select aria-label="Hónap" value={target.month} onChange={(e) => setTarget({ ...target, month: Number(e.target.value) })}>
            {MONTH_NAMES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
          </select>
          <button className="btn primary" disabled={busy || exists || target.year < 2000 || target.year > 2100} onClick={create}>Létrehozás</button>
        </div>
        {exists && <p className="muted small">Ez a hónap már létezik.</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </section>

      <section>
        <h2>Összes hónap</h2>
        <ul className="list">
          {months.map((m) => (
            <li key={key(m)} className="item">
              <Link to={`/honap/${m.year}/${m.month}`} className="row-btn link">
                <span className="grow">
                  <span>{monthLabel(m.year, m.month)}</span>
                  <span className="muted small block">Bevétel {formatMoney(m.totalIncome)} · Kiadás {formatMoney(m.totalExpense)}</span>
                </span>
                <strong className={signClass(m.remaining)}>{formatMoney(m.remaining)}</strong>
              </Link>
            </li>
          ))}
          {months.length === 0 && <li className="item muted">Még nincs létrehozott hónap. Hozd létre az elsőt fent.</li>}
        </ul>
      </section>

      {months.length >= 2 && <Compare months={months} />}
    </>
  );
}
