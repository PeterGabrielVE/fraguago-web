'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export type Field = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'email' | 'textarea' | 'checkbox';
  options?: string[];
  required?: boolean;
};
export type Column = { key: string; label: string; render?: (row: any) => any };

export default function ResourceManager({
  title, subtitle, endpoint, columns, fields,
}: {
  title: string; subtitle?: string; endpoint: string; columns: Column[]; fields: Field[];
}) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<Record<string, any>>({});
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { setItems(await api.get(endpoint)); setError(''); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [endpoint]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const payload: Record<string, any> = {};
      for (const f of fields) {
        let v = form[f.name];
        if (v === '' || v === undefined) continue;
        if (f.type === 'number') v = Number(v);
        if (f.type === 'checkbox' && v === false) continue;
        payload[f.name] = v;
      }
      await api.post(endpoint, payload);
      setForm({}); setOpen(false); load();
    } catch (e: any) { setError(e.message); }
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este registro?')) return;
    try { await api.del(`${endpoint}/${id}`); load(); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <>
      <div className="topbar">
        <h1>{title}</h1>
        <button className="btn btn-amber" onClick={() => setOpen(!open)}>
          {open ? 'Cancelar' : `Nuevo`}
        </button>
      </div>
      <div className="content">
        {subtitle && <div className="page-sub">{subtitle}</div>}
        {error && <div className="error">{error}</div>}

        {open && (
          <div className="card section">
            <form className="form" onSubmit={create}>
              {fields.map((f) => (
                <div className="field" key={f.name}>
                  <label>{f.label}{f.required && ' *'}</label>
                  {f.type === 'checkbox' ? (
                    <div className="checkbox-item">
                      <input type="checkbox" checked={form[f.name] ?? false}
                        onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })} />
                      <label style={{ marginBottom: 0 }}>{f.label}</label>
                    </div>
                  ) : f.type === 'select' ? (
                    <select value={form[f.name] ?? ''} required={f.required}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}>
                      <option value="">Selecciona…</option>
                      {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === 'textarea' ? (
                    <textarea className="input" required={f.required} value={form[f.name] ?? ''}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                  ) : (
                    <input className="input" type={f.type || 'text'} required={f.required}
                      value={form[f.name] ?? ''}
                      onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                  )}
                </div>
              ))}
              <div className="full">
                <button className="btn btn-primary" type="submit">Guardar</button>
              </div>
            </form>
          </div>
        )}

        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading"><div className="spinner"></div></div>
          ) : items.length === 0 ? (
            <div className="empty">Aún no hay registros. Crea el primero con el botón "Nuevo".</div>
          ) : (
            <table className="table">
              <thead>
                <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}<th></th></tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    {columns.map((c) => <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>)}
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(row.id)}>Eliminar</button>
                    </td>
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
