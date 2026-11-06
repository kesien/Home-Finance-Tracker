import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { formatMoney, monthLabel, parseSigned, MONTH_NAMES } from '../format.js';
import { ForecastChart } from '../components/Charts.jsx';

const signClass = (n) => (n < 0 ? 'neg' : n > 0 ? 'pos' : '');
const shortLabel = (r) => `${String(r.year).slice(2)}. ${MONTH_NAMES[r.month - 1].slice(0, 3)}`;

export default function ForecastPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [thresholdText, setThresholdText] = useState('0');
  const [saveError, setSaveError] = useState('');

  const load = useCallback(() => {
    let stale = false;
    api.get('/forecast')
      .then((d) => { if (!stale) { setData(d); setThresholdText(String(d.threshold)); setError(''); } })
      .catch((e) => !stale && setError(e.message));
    return () => { stale = true; };
  }, []);
  useEffect(() => load(), [load]);

  async function saveThreshold(e) {
    e.preventDefault();
    const v = parseSigned(thresholdText);
    if (v === null) return setSaveError('A küszöb egész szám legyen (Ft)');
    setSaveError('');
    try {
      await api.put('/settings', { forecastThreshold: v });
      load();
    } catch (err) {
      setSaveError(err.message);
    }
  }

  if (error) return <><h1>Előrejelzés</h1><p className="error" role="alert">{error}</p></>;
  if (!data) return <><h1>Előrejelzés</h1><p className="muted">Betöltés…</p></>;

  const chart = data.rows.map((r) => ({ label: shortLabel(r), balance: r.balance }));
  return (
    <>
      <h1>Előrejelzés</h1>
      <p className="muted small">
        Kiindulópont: {monthLabel(data.base.year, data.base.month)} számlán + megtakarítás egyenlege. Havi bevétel = fix bevételek + a változó bevételek átlaga
        (utolsó {data.avgN} hónap, {data.monthsUsed} hónap alapján). Kiadás = az alaphónap fix havi tételei (lejáratukig) + az adott hónapban esedékes éves tételek.
      </p>

      {data.firstBelow ? (
        <p className="warn" role="alert">
          ⚠ Az egyenleg {monthLabel(data.firstBelow.year, data.firstBelow.month)} hónapban a küszöb ({formatMoney(data.threshold)}) alá esik.
        </p>
      ) : (
        <p className="okbar" role="status">Az egyenleg a következő 12 hónapban nem esik a küszöb ({formatMoney(data.threshold)}) alá.</p>
      )}

      <div className="grid cards">
        <div className="card"><span className="muted">Kiindulóegyenleg</span><strong className="big">{formatMoney(data.startBalance)}</strong></div>
        <div className="card"><span className="muted">Fix bevétel / hó</span><strong className="big pos">{formatMoney(data.fixedIncome)}</strong></div>
        <div className="card"><span className="muted">Változó bevétel átlaga</span><strong className="big pos">{formatMoney(data.avgVariableIncome)}</strong></div>
      </div>

      <div className="card"><ForecastChart data={chart} threshold={data.threshold} /></div>

      <form className="row form" onSubmit={saveThreshold}>
        <label className="grow">Figyelmeztetési küszöb (Ft)
          <input inputMode="text" value={thresholdText} onChange={(e) => setThresholdText(e.target.value)} />
        </label>
        <button className="btn">Mentés</button>
      </form>
      {saveError && <p className="error" role="alert">{saveError}</p>}

      <section>
        <h2>Hónapról hónapra</h2>
        <div className="table-wrap">
          <table className="plain">
            <thead><tr><th scope="col">Hónap</th><th scope="col">Bevétel</th><th scope="col">Kiadás</th><th scope="col">Változás</th><th scope="col">Egyenleg</th></tr></thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={`${r.year}-${r.month}`} className={r.belowThreshold ? 'below' : ''}>
                  <th scope="row">{monthLabel(r.year, r.month)}</th>
                  <td>{formatMoney(r.income)}</td>
                  <td>{formatMoney(r.expense)}</td>
                  <td className={signClass(r.change)}>{r.change > 0 ? '+' : ''}{formatMoney(r.change)}</td>
                  <td className={signClass(r.balance)}><strong>{formatMoney(r.balance)}</strong>{r.belowThreshold ? ' ⚠' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
