'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function FinancesPage() {
  const [summary, setSummary] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ type: 'INCOME' });
  const [error, setError] = useState('');

  async function load() {
    setItems(await api.list('/transactions'));
    try { setSummary(await api.get('/transactions/summary')); } catch { }
  }
  useEffect(() => { load().catch((e) => setError(e.message)); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      await api.post('/transactions', { type: form.type, amount: Number(form.amount), note: form.note || undefined });
      setForm({ type: 'INCOME' }); setOpen(false); load();
    } catch (e: any) { setError(e.message); }
  }

  return (
    <>
      <div className="topbar"><h1>Finanzas</h1></div>
      <div className="content">
        {error && <div className="error">{error}</div>}
        {summary && (
          <div className="grid grid-3" style={{ marginBottom: 16 }}>
            <div className="card stat"><div className="label">Ingresos</div><div className="value teal">${summary.income || 0}</div></div>
            <div className="card stat"><div className="label">Egresos</div><div className="value" style={{ color: 'var(--danger)' }}>${summary.expense || 0}</div></div>
            <div className="card stat"><div className="label">Balance</div><div className="value amber">${summary.balance || 0}</div></div>
          </div>
        )}
        <div className="row" style={{ marginBottom: 12 }}>
          <h2>Movimientos</h2>
          <button className="btn btn-amber" onClick={() => setOpen(!open)}>{open ? 'Cancelar' : 'Nuevo'}</button>
        </div>
        {open && (
          <div className="card section">
            <form className="form" onSubmit={create}>
              <div className="field"><label>Tipo *</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="INCOME">Ingreso</option><option value="EXPENSE">Egreso</option>
                </select>
              </div>
              <div className="field"><label>Monto *</label>
                <input className="input" type="number" step="0.01" required value={form.amount ?? ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="field full"><label>Nota</label>
                <input className="input" value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </div>
              <div className="full"><button className="btn btn-primary" type="submit">Guardar</button></div>
            </form>
          </div>
        )}
        <div className="card" style={{ padding: 0 }}>
          {items.length === 0 ? <div className="empty">Sin movimientos.</div> : (
            <table className="table">
              <thead><tr><th>Tipo</th><th>Monto</th><th>Nota</th><th>Fecha</th></tr></thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id}>
                    <td><span className={`badge ${t.type === 'INCOME' ? 'income' : 'expense'}`}>{t.type === 'INCOME' ? 'Ingreso' : 'Egreso'}</span></td>
                    <td>${t.amount}</td>
                    <td className="muted">{t.note || '—'}</td>
                    <td>{new Date(t.date).toLocaleDateString('es-MX')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
