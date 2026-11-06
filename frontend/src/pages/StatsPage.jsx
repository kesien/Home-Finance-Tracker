import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { monthLabel } from '../format.js';
import { trendData, incomeComposition, categoryBreakdown } from '../stats.js';
import { TrendChart, IncomeStack, CategoryPie } from '../components/Charts.jsx';

export default function StatsPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [sel, setSel] = useState(null); // kiválasztott hónap indexe a kategória-diagramhoz

  useEffect(() => {
    api.get('/stats').then((s) => { setStats(s); setSel(s.months.length - 1); }).catch((e) => setError(e.message));
  }, []);

  const trend = useMemo(() => (stats ? trendData(stats.months) : []), [stats]);
  const comp = useMemo(() => (stats ? incomeComposition(stats.months) : null), [stats]);

  if (error) return <p className="error" role="alert">{error}</p>;
  if (!stats) return <p className="muted">Betöltés…</p>;
  if (stats.months.length === 0) return <><h1>Statisztika</h1><p className="muted">Még nincs létrehozott hónap.</p></>;

  const chosen = stats.months[sel];
  return (
    <>
      <h1>Statisztika</h1>
      <section>
        <h2>Havi trend</h2>
        <div className="card"><TrendChart data={trend} /></div>
      </section>
      <section>
        <h2>Bevételi összetétel</h2>
        <div className="card"><IncomeStack rows={comp.rows} names={comp.names} /></div>
      </section>
      <section>
        <div className="section-head">
          <h2>Kiadási kategóriák</h2>
          <select aria-label="Hónap" value={sel} onChange={(e) => setSel(Number(e.target.value))}>
            {stats.months.map((m, i) => <option key={`${m.year}-${m.month}`} value={i}>{monthLabel(m.year, m.month)}</option>)}
          </select>
        </div>
        <div className="card"><CategoryPie data={categoryBreakdown(chosen.categoryTotals, stats.categories)} /></div>
      </section>
    </>
  );
}
