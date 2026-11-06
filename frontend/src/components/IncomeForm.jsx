import { useState } from 'react';
import Sheet from './Sheet.jsx';
import { parseAmount } from '../format.js';

export default function IncomeForm({ initial, onSave, onDelete, onClose }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [type, setType] = useState(initial?.type ?? 'variable');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const value = parseAmount(amount);
    if (!name.trim()) return setError('Add meg a nevet');
    if (value === null) return setError('Az összeg egész szám legyen (Ft)');
    if (saving) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), amount: value, type });
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

  return (
    <Sheet title={initial ? 'Bevétel szerkesztése' : 'Új bevétel'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>Név<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="pl. Apa fizu" /></label>
        <label>Összeg (Ft)<input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="832000" /></label>
        <div className="seg" role="group" aria-label="Típus">
          <button type="button" className={type === 'fixed' ? 'on' : ''} onClick={() => setType('fixed')}>Fix</button>
          <button type="button" className={type === 'variable' ? 'on' : ''} onClick={() => setType('variable')}>Változó</button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions">
          {initial && <button type="button" className="btn danger" onClick={remove} disabled={saving}>Törlés</button>}
          <button className="btn primary" disabled={saving}>Mentés</button>
        </div>
      </form>
    </Sheet>
  );
}
