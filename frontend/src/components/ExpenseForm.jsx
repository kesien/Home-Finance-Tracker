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
  const [saving, setSaving] = useState(false);

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
    const yearOk = (y) => Number.isInteger(Number(y)) && Number(y) >= 2000 && Number(y) <= 2100;
    if (type !== 'monthly' && !yearOk(dueYear)) return setError('Az esedékesség éve 2000 és 2100 közötti legyen');
    if (type !== 'yearly' && hasEnd && !yearOk(endYear)) return setError('A lejárat éve 2000 és 2100 közötti legyen');
    if (!categoryId) return setError('Válassz kategóriát');
    const body = { name: name.trim(), amount: value, type, category_id: Number(categoryId) };
    // Éves és negyedéves tételnél esedékesség kell; havi és negyedéves tételnél opcionális a lejárat.
    if (type !== 'monthly') Object.assign(body, { due_year: Number(dueYear), due_month: Number(dueMonth) });
    if (type !== 'yearly') {
      if (hasEnd) Object.assign(body, { end_year: Number(endYear), end_month: Number(endMonth) });
      else Object.assign(body, { end_year: null, end_month: null }); // meglévő lejárat törlése
    }
    if (saving) return;
    setSaving(true);
    try {
      await onSave(body);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  async function remove() {
    if (saving) return;
    setSaving(true);
    try {
      await onDelete();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
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
          <button type="button" className={type === 'quarterly' ? 'on' : ''} onClick={() => setType('quarterly')}>Negyedéves</button>
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
        {type !== 'monthly' && (
          <fieldset><legend>{type === 'quarterly' ? 'Első esedékesség (innen 3 havonta)' : 'Esedékes'}</legend>
            <div className="row">
              <input type="number" aria-label="Esedékesség éve" value={dueYear} onChange={(e) => setDueYear(e.target.value)} />
              {monthSelect(dueMonth, setDueMonth)}
            </div>
          </fieldset>
        )}
        {type !== 'yearly' && (
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
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions">
          {initial && <button type="button" className="btn danger" onClick={remove} disabled={saving}>Törlés</button>}
          <button className="btn primary" disabled={saving}>Mentés</button>
        </div>
      </form>
    </Sheet>
  );
}
