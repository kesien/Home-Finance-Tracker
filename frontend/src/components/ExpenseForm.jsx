import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { api } from '../api.js';
import { parseAmount, MONTH_NAMES } from '../format.js';

export default function ExpenseForm({ initial, categories, year, month, onCategoryCreated, onSave, onDelete, onClose }) {
  const egyeb = categories.find((c) => c.name === 'Egyéb')?.id ?? categories[0]?.id;
  const [name, setName] = useState(initial?.name ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [type, setType] = useState(initial?.type ?? 'monthly');
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? egyeb);
  const [newCat, setNewCat] = useState(null); // null = nem látszik a mező
  const [dueYear, setDueYear] = useState(initial?.due_year ?? year);
  const [dueMonth, setDueMonth] = useState(initial?.due_month ?? month);
  const [hasEnd, setHasEnd] = useState(initial?.end_year != null);
  const [endYear, setEndYear] = useState(initial?.end_year ?? year);
  const [endMonth, setEndMonth] = useState(initial?.end_month ?? month);
  const [error, setError] = useState('');

  async function addCategory() {
    if (!newCat?.trim()) return;
    try {
      const c = await api.post('/categories', { name: newCat.trim() });
      await onCategoryCreated();
      setCategoryId(c.id);
      setNewCat(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function submit(e) {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!name.trim()) return setError('Add meg a nevet');
    if (value === null) return setError('Az összeg egész szám legyen (Ft)');
    const body = { name: name.trim(), amount: value, type, category_id: Number(categoryId) };
    if (type === 'yearly') Object.assign(body, { due_year: Number(dueYear), due_month: Number(dueMonth) });
    else if (hasEnd) Object.assign(body, { end_year: Number(endYear), end_month: Number(endMonth) });
    try {
      await onSave(body);
    } catch (err) {
      setError(err.message);
    }
  }

  const monthSelect = (value, set) => (
    <select value={value} onChange={(e) => set(Number(e.target.value))}>
      {MONTH_NAMES.map((n, i) => <option key={n} value={i + 1}>{n}</option>)}
    </select>
  );

  return (
    <Sheet title={initial ? 'Kiadás szerkesztése' : 'Új kiadás'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>Név<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="pl. Villany" /></label>
        <label>Összeg (Ft)<input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="25000" /></label>
        <div className="seg" role="group" aria-label="Típus">
          <button type="button" className={type === 'monthly' ? 'on' : ''} onClick={() => setType('monthly')}>Havi</button>
          <button type="button" className={type === 'yearly' ? 'on' : ''} onClick={() => setType('yearly')}>Éves</button>
        </div>
        <label>Kategória
          <select value={categoryId} onChange={(e) => (e.target.value === 'new' ? setNewCat('') : setCategoryId(Number(e.target.value)))}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="new">+ Új kategória…</option>
          </select>
        </label>
        {newCat !== null && (
          <div className="row">
            <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Kategória neve" />
            <button type="button" className="btn" onClick={addCategory}>Hozzáad</button>
          </div>
        )}
        {type === 'yearly' ? (
          <fieldset><legend>Esedékes</legend>
            <div className="row">
              <input type="number" value={dueYear} onChange={(e) => setDueYear(e.target.value)} />
              {monthSelect(dueMonth, setDueMonth)}
            </div>
          </fieldset>
        ) : (
          <fieldset><legend>Lejárat</legend>
            <label className="check"><input type="checkbox" checked={hasEnd} onChange={(e) => setHasEnd(e.target.checked)} /> Van lejárata (pl. hitel utolsó hónapja)</label>
            {hasEnd && (
              <div className="row">
                <input type="number" value={endYear} onChange={(e) => setEndYear(e.target.value)} />
                {monthSelect(endMonth, setEndMonth)}
              </div>
            )}
          </fieldset>
        )}
        {error && <p className="error">{error}</p>}
        <div className="actions">
          {initial && <button type="button" className="btn danger" onClick={onDelete}>Törlés</button>}
          <button className="btn primary">Mentés</button>
        </div>
      </form>
    </Sheet>
  );
}
