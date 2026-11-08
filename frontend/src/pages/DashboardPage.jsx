import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatMoney, monthLabel, categoryColor } from '../format.js';
import { categoryBreakdown, upcomingExpenses } from '../stats.js';
import { CategoryPie } from '../components/Charts.jsx';

const signClass = (n) => (n < 0 ? 'neg' : n > 0 ? 'pos' : '');

export default function DashboardPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let stale = false;
    Promise.all([api.get(`/months/${year}/${month}`), api.get('/categories')])
      .then(([data, categories]) => !stale && setState({ status: 'ready', data, categories }))
      .catch((e) => !stale && setState({ status: e.status === 404 ? 'missing' : 'error', error: e.message }));
    return () => { stale = true; };
  }, [year, month]);

  const title = <h1>{monthLabel(year, month)}</h1>;
  if (state.status === 'loading') return <>{title}<p className="muted">Betöltés…</p></>;
  if (state.status === 'error') return <>{title}<p className="error" role="alert">{state.error}</p></>;
  if (state.status === 'missing') {
    return (
      <>
        {title}
        <div className="card empty">
          <p>Az aktuális hónap még nincs létrehozva.</p>
          <Link className="btn primary link" to="/honapok">Hónap létrehozása</Link>
        </div>
      </>
    );
  }

  const { data, categories } = state;
  const { summary } = data;
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const upcoming = upcomingExpenses(data.expenses);
  const totalMoney = data.month.accountBalance + data.month.savingsBalance + data.month.cashBalance;

  return (
    <>
      {title}
      <div className="grid cards">
        <div className="card"><span className="muted">Összes bevétel</span><strong className="big pos">{formatMoney(summary.totalIncome)}</strong></div>
        <div className="card"><span className="muted">Összes kiadás</span><strong className={`big ${summary.totalExpense > 0 ? 'neg' : ''}`}>{formatMoney(summary.totalExpense)}</strong></div>
        <div className="card"><span className="muted">Fennmaradó</span><strong className={`big ${signClass(summary.remaining)}`}>{formatMoney(summary.remaining)}</strong></div>
        <div className="card"><span className="muted">Hátralévő kiadás</span><strong className="big">{formatMoney(summary.unpaid)}</strong></div>
        <div className="card"><span className="muted">Számlán</span><strong className={`big ${signClass(data.month.accountBalance)}`}>{formatMoney(data.month.accountBalance)}</strong></div>
        <div className="card"><span className="muted">Megtakarítás</span><strong className={`big ${signClass(data.month.savingsBalance)}`}>{formatMoney(data.month.savingsBalance)}</strong></div>
        <div className="card"><span className="muted">Készpénz</span><strong className={`big ${signClass(data.month.cashBalance)}`}>{formatMoney(data.month.cashBalance)}</strong></div>
        <div className="card wide">
          <span className="muted">Összes pénz</span>
          <strong className={`big ${signClass(totalMoney)}`}>{formatMoney(totalMoney)}</strong>
          <span className="hint">számlán + megtakarítás + készpénz</span>
        </div>
      </div>

      <section>
        <div className="section-head"><h2>Közelgő kiadások</h2><Link className="muted small" to="/honap">Hónap nézet →</Link></div>
        <ul className="list">
          {upcoming.map((e) => (
            <li key={e.id} className="item">
              <span className="grow">
                <span>{e.name}</span>
                <span className="muted small block">
                  <span className="dot" style={{ background: categoryColor(e.category_id) }} />{catById[e.category_id]?.name}
                  {e.type === 'yearly' ? ' · éves, ebben a hónapban esedékes' : e.type === 'quarterly' ? ' · negyedéves, ebben a hónapban esedékes' : ''}
                </span>
              </span>
              <strong>{formatMoney(e.amount)}</strong>
            </li>
          ))}
          {upcoming.length === 0 && <li className="item muted">Nincs kifizetetlen kiadás. 🎉</li>}
        </ul>
      </section>

      <section>
        <h2>Kiadások kategóriák szerint</h2>
        <div className="card"><CategoryPie data={categoryBreakdown(summary.categoryTotals, categories)} /></div>
      </section>
    </>
  );
}
