import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { formatMoney, monthLabel, parseSigned, shiftMonth, categoryColor } from '../format.js';
import IncomeForm from '../components/IncomeForm.jsx';
import ExpenseForm from '../components/ExpenseForm.jsx';

const signClass = (n) => (n < 0 ? 'neg' : n > 0 ? 'pos' : '');

function BalanceField({ label, value, onSave }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  function commit() {
    const v = parseSigned(text);
    if (v === null) return setText(String(value));
    if (v !== value) onSave(v).catch(() => setText(String(value))); // hibánál a régi érték áll vissza
  }
  return (
    <label className="card balance">
      <span className="muted">{label}</span>
      <input inputMode="numeric" value={text} onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && e.target.blur()} />
      <span className="hint">{formatMoney(value)}</span>
    </label>
  );
}

export default function MonthPage() {
  const params = useParams();
  const navigate = useNavigate();
  const now = new Date();
  const year = Number(params.year ?? now.getFullYear());
  const month = Number(params.month ?? now.getMonth() + 1);

  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | missing | error
  const [error, setError] = useState('');
  const [form, setForm] = useState(null); // {kind:'income'|'expense', item?}
  const [fabOpen, setFabOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fabRef = useRef(null);

  // Csak a legutóbb indított betöltés eredménye érvényes: lassú, korábbi hónap válasza ne írja felül az újat.
  const reqId = useRef(0);
  const load = useCallback(async () => {
    const my = ++reqId.current;
    try {
      const [cats, detail] = await Promise.all([api.get('/categories'), api.get(`/months/${year}/${month}`)]);
      if (my !== reqId.current) return;
      setCategories(cats);
      setData(detail);
      setStatus('ready');
    } catch (e) {
      if (my !== reqId.current) return;
      if (e.status === 404) {
        setData(null);
        setCategories(await api.get('/categories').catch(() => []));
        if (my === reqId.current) setStatus('missing');
      } else {
        setError(e.message);
        // Ha már van megjelenített adat, megtartjuk, csak a hibasávot mutatjuk.
        setStatus((st) => (st === 'ready' ? 'ready' : 'error'));
      }
    }
  }, [year, month]);

  // A mutáció közben hónapot váltó felhasználónál az *aktuális* hónap load-ját kell hívni, nem a régi rendert.
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    setStatus('loading');
    setData(null);
    setError('');
    setForm(null);
    load();
  }, [load]);

  const go = (d) => {
    const n = shiftMonth(year, month, d);
    navigate(`/honap/${n.year}/${n.month}`);
  };

  // mutate: hibát továbbdobja (az űrlap a saját hibasávjában mutatja); act: oldalszintű hibasávval.
  async function mutate(fn) {
    await fn();
    setForm(null);
    await loadRef.current();
  }
  async function act(fn) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await mutate(fn);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const header = (
    <div className="month-head">
      <button className="icon-btn" onClick={() => go(-1)} aria-label="Előző hónap">‹</button>
      <h1>{monthLabel(year, month)}</h1>
      <button className="icon-btn" onClick={() => go(1)} aria-label="Következő hónap">›</button>
    </div>
  );

  if (status === 'loading') return <>{header}<p className="muted">Betöltés…</p></>;
  if (status === 'error') return <>{header}<p className="error" role="alert">{error}</p><button className="btn" onClick={() => { setStatus('loading'); setError(''); load(); }}>Újra</button></>;
  if (status === 'missing') {
    return (
      <>
        {header}
        <div className="card empty">
          <p>Ez a hónap még nincs létrehozva.</p>
          <p className="muted">Létrehozáskor az előző hónap fix tételei átmásolódnak.</p>
          <button className="btn primary" disabled={busy} onClick={() => act(() => api.post('/months', { year, month }))}>Hónap létrehozása</button>
          {error && <p className="error">{error}</p>}
        </div>
      </>
    );
  }

  const { summary, incomes, expenses, average } = data;
  const totalMoney = data.month.accountBalance + data.month.savingsBalance + data.month.cashBalance;
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const catTotals = Object.entries(summary.categoryTotals)
    .map(([id, total]) => ({ id: Number(id), name: catById[id]?.name ?? '?', total }))
    .sort((a, b) => b.total - a.total);
  async function patchBalance(body) {
    setBusy(true);
    setError('');
    try {
      await mutate(() => api.patch(`/months/${year}/${month}`, body));
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setBusy(false);
    }
  }
  const togglePaid = (e) => act(() => api.patch(`/expenses/${e.id}`, { paid: !e.paid }));

  return (
    <>
      {header}
      {error && (
        <p className="error" role="alert">
          {error} <button className="btn" onClick={() => setError('')}>Bezár</button>
        </p>
      )}

      <div className="grid cards">
        <div className="card"><span className="muted">Bevétel</span><strong className="big pos">{formatMoney(summary.totalIncome)}</strong></div>
        <div className="card"><span className="muted">Kiadás</span><strong className="big neg">{formatMoney(summary.totalExpense)}</strong></div>
        <div className="card"><span className="muted">Fennmaradó</span><strong className={`big ${signClass(summary.remaining)}`}>{formatMoney(summary.remaining)}</strong></div>
        <div className="card"><span className="muted">Hátralévő (nem fizetett)</span><strong className="big">{formatMoney(summary.unpaid)}</strong></div>
        <BalanceField label="Számlán" value={data.month.accountBalance} onSave={(v) => patchBalance({ accountBalance: v })} />
        <BalanceField label="Megtakarítás" value={data.month.savingsBalance} onSave={(v) => patchBalance({ savingsBalance: v })} />
        <BalanceField label="Készpénz" value={data.month.cashBalance} onSave={(v) => patchBalance({ cashBalance: v })} />
        <div className="card wide">
          <span className="muted">Összes pénz</span>
          <strong className={`big ${signClass(totalMoney)}`}>{formatMoney(totalMoney)}</strong>
          <span className="hint">számlán + megtakarítás + készpénz</span>
        </div>
      </div>

      <section>
        <div className="section-head"><h2>Bevételek</h2><button className="btn" onClick={() => setForm({ kind: 'income' })}>+ Új</button></div>
        <ul className="list">
          {incomes.map((i) => (
            <li key={i.id} className="item">
              <button type="button" className="row-btn" onClick={() => setForm({ kind: 'income', item: i })}>
                <span className="grow"><span>{i.name}</span><span className="muted small block">{i.type === 'fixed' ? 'fix' : 'változó'}</span></span>
                <strong className="pos">{formatMoney(i.amount)}</strong>
              </button>
            </li>
          ))}
          {incomes.length === 0 && <li className="muted item">Még nincs bevétel.</li>}
        </ul>
        <p className="muted small">
          Átlag (utolsó {average.n} hónap, {average.total.monthsUsed} hónap alapján): összes bevétel {formatMoney(average.total.average)}, ebből változó {formatMoney(average.variable.average)}
        </p>
      </section>

      <section>
        <div className="section-head"><h2>Kiadások</h2><button className="btn" onClick={() => setForm({ kind: 'expense' })}>+ Új</button></div>
        <ul className="list">
          {expenses.map((e) => (
            <li key={e.id} className={`item ${e.counted ? '' : 'dim'}`}>
              <button className={`check-btn ${e.paid ? 'on' : ''}`} onClick={() => togglePaid(e)} aria-label={e.paid ? 'Kifizetve – visszavonás' : 'Megjelölés kifizetettnek'} aria-pressed={e.paid} disabled={busy}>{e.paid ? '✓' : ''}</button>
              <button type="button" className="row-btn" onClick={() => setForm({ kind: 'expense', item: e })}>
                <span className="grow">
                <span>{e.name}</span>
                <span className="muted small block">
                  <span className="dot" style={{ background: categoryColor(e.category_id) }} />
                  {catById[e.category_id]?.name}
                  {e.type === 'yearly' && ` · éves, esedékes: ${monthLabel(e.due_year, e.due_month)}${e.counted ? '' : ' (ebben a hónapban nem számít)'}`}
                  {e.type === 'monthly' && e.end_year != null && ` · lejár: ${monthLabel(e.end_year, e.end_month)}`}
                </span>
                </span>
                <strong>{formatMoney(e.amount)}</strong>
              </button>
            </li>
          ))}
          {expenses.length === 0 && <li className="muted item">Még nincs kiadás.</li>}
        </ul>
      </section>

      <section>
        <h2>Kategóriák szerint</h2>
        <ul className="list">
          {catTotals.map((c) => (
            <li key={c.id} className="item">
              <span><span className="dot" style={{ background: categoryColor(c.id) }} />{c.name}</span>
              <strong>{formatMoney(c.total)}</strong>
            </li>
          ))}
          {catTotals.length === 0 && <li className="muted item">Nincs beleszámító kiadás.</li>}
        </ul>
      </section>

      <div className="fab-wrap" onKeyDown={(e) => e.key === 'Escape' && setFabOpen(false)}>
        {fabOpen && (
          <div className="fab-menu">
            <button className="btn" onClick={() => { setFabOpen(false); fabRef.current?.focus(); setForm({ kind: 'income' }); }}>Bevétel</button>
            <button className="btn" onClick={() => { setFabOpen(false); fabRef.current?.focus(); setForm({ kind: 'expense' }); }}>Kiadás</button>
          </div>
        )}
        <button className="fab" ref={fabRef} onClick={() => setFabOpen(!fabOpen)} aria-label="Új tétel" aria-expanded={fabOpen}>+</button>
      </div>

      {form?.kind === 'income' && (
        <IncomeForm
          initial={form.item}
          onClose={() => setForm(null)}
          onSave={(b) => mutate(() => (form.item ? api.patch(`/incomes/${form.item.id}`, b) : api.post(`/months/${year}/${month}/incomes`, b)))}
          onDelete={() => confirm('Biztosan törlöd?') && mutate(() => api.del(`/incomes/${form.item.id}`))}
        />
      )}
      {form?.kind === 'expense' && (
        <ExpenseForm
          initial={form.item}
          categories={categories}
          year={year}
          month={month}
          onCategoryCreated={async () => setCategories(await api.get('/categories'))}
          onClose={() => setForm(null)}
          onSave={(b) => mutate(() => (form.item ? api.patch(`/expenses/${form.item.id}`, b) : api.post(`/months/${year}/${month}/expenses`, b)))}
          onDelete={() => confirm('Biztosan törlöd?') && mutate(() => api.del(`/expenses/${form.item.id}`))}
        />
      )}
    </>
  );
}
