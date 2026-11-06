import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { categoryColor } from '../format.js';

export default function CategoriesPage() {
  const [cats, setCats] = useState([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null); // {id, name}
  const [error, setError] = useState('');

  const load = useCallback(() => api.get('/categories').then(setCats).catch((e) => setError(e.message)), []);
  useEffect(() => { load(); }, [load]);

  async function run(fn) {
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section>
      <h1>Kategóriák</h1>
      <form className="row" onSubmit={(e) => { e.preventDefault(); if (name.trim()) run(async () => { await api.post('/categories', { name }); setName(''); }); }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Új kategória neve" />
        <button className="btn primary">Hozzáad</button>
      </form>
      {error && <p className="error">{error}</p>}
      <ul className="list">
        {cats.map((c) => (
          <li key={c.id} className="item">
            {editing?.id === c.id ? (
              <form className="row grow" onSubmit={(e) => { e.preventDefault(); run(async () => { await api.patch(`/categories/${c.id}`, { name: editing.name }); setEditing(null); }); }}>
                <input autoFocus value={editing.name} onChange={(e) => setEditing({ id: c.id, name: e.target.value })} />
                <button className="btn primary">Mentés</button>
                <button type="button" className="btn" onClick={() => setEditing(null)}>Mégse</button>
              </form>
            ) : (
              <>
                <span className="grow"><span className="dot" style={{ background: categoryColor(c.id) }} />{c.name} <span className="muted small">({c.itemCount} tétel)</span></span>
                <button className="btn" onClick={() => setEditing({ id: c.id, name: c.name })}>Átnevez</button>
                <button className="btn danger" disabled={c.itemCount > 0} title={c.itemCount > 0 ? 'Van hozzá tétel, nem törölhető' : ''} onClick={() => confirm(`Törlöd: ${c.name}?`) && run(() => api.del(`/categories/${c.id}`))}>Töröl</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
