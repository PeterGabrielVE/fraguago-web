'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function HealthPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [health, setHealth] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/members').then(setMembers).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function loadHealth(memberId: string) {
    if (!memberId) { setHealth(null); setForm({}); return; }
    try {
      const h = await api.get(`/health-profiles?memberId=${memberId}`);
      setHealth(Array.isArray(h) ? h[0] : h);
      setForm(h ? { ...h } : {});
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    try {
      const payload = {
        memberId: selected,
        hasHypertension: form.hasHypertension || false,
        hasDiabetes: form.hasDiabetes || false,
        hasHeartProblems: form.hasHeartProblems || false,
        hasAsthma: form.hasAsthma || false,
        otherConditions: form.otherConditions || undefined,
        hasInjury: form.hasInjury || false,
        injuryDescription: form.injuryDescription || undefined,
        medicalClearance: form.medicalClearance !== false,
      };
      if (health?.id) {
        await api.patch(`/health-profiles/${health.id}`, payload);
      } else {
        await api.post('/health-profiles', payload);
      }
      setOpen(false);
      loadHealth(selected);
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (loading) return <div className="content"><div className="loading"><div className="spinner"></div></div></div>;

  return (
    <>
      <div className="topbar"><h1>Ficha Médica</h1></div>
      <div className="content">
        <p className="page-sub">Datos de salud y condiciones médicas de los socios.</p>
        {error && <div className="error">{error}</div>}
        
        <div className="card section">
          <div className="row" style={{ justifyContent: 'flex-start', gap: 10 }}>
            <select value={selected} onChange={(e) => { setSelected(e.target.value); loadHealth(e.target.value); }} style={{ maxWidth: 320 }}>
              <option value="">Selecciona un socio…</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.user?.profile?.firstName} {m.user?.profile?.lastName}</option>)}
            </select>
            {selected && <button className="btn btn-amber" onClick={() => setOpen(!open)}>{open ? 'Cancelar' : 'Editar'}</button>}
          </div>
        </div>

        {selected && health && (
          <div className="card section">
            <h2 style={{ marginBottom: 16 }}>Información Actual</h2>
            <div className="grid grid-2">
              <div><strong>Hipertensión:</strong> {health.hasHypertension ? '✓ Sí' : '✗ No'}</div>
              <div><strong>Diabetes:</strong> {health.hasDiabetes ? '✓ Sí' : '✗ No'}</div>
              <div><strong>Problemas cardiacos:</strong> {health.hasHeartProblems ? '✓ Sí' : '✗ No'}</div>
              <div><strong>Asma:</strong> {health.hasAsthma ? '✓ Sí' : '✗ No'}</div>
              {health.otherConditions && <div className="full"><strong>Otros:</strong> {health.otherConditions}</div>}
              {health.hasInjury && <div className="full"><strong>Lesión/Limitación:</strong> {health.injuryDescription || 'Sí'}</div>}
            </div>
          </div>
        )}

        {open && selected && (
          <div className="card section">
            <h2 style={{ marginBottom: 16 }}>Editar Ficha Médica</h2>
            <form className="form" onSubmit={save}>
              <div className="field">
                <div className="checkbox-item">
                  <input type="checkbox" checked={form.hasHypertension || false} onChange={(e) => setForm({ ...form, hasHypertension: e.target.checked })} />
                  <label>Hipertensión</label>
                </div>
              </div>
              <div className="field">
                <div className="checkbox-item">
                  <input type="checkbox" checked={form.hasDiabetes || false} onChange={(e) => setForm({ ...form, hasDiabetes: e.target.checked })} />
                  <label>Diabetes</label>
                </div>
              </div>
              <div className="field">
                <div className="checkbox-item">
                  <input type="checkbox" checked={form.hasHeartProblems || false} onChange={(e) => setForm({ ...form, hasHeartProblems: e.target.checked })} />
                  <label>Problemas cardiacos</label>
                </div>
              </div>
              <div className="field">
                <div className="checkbox-item">
                  <input type="checkbox" checked={form.hasAsthma || false} onChange={(e) => setForm({ ...form, hasAsthma: e.target.checked })} />
                  <label>Asma</label>
                </div>
              </div>
              <div className="field full">
                <label>Otras condiciones</label>
                <textarea className="input" value={form.otherConditions || ''} onChange={(e) => setForm({ ...form, otherConditions: e.target.value })} placeholder="Describe otras condiciones si existen…" />
              </div>
              <div className="field">
                <div className="checkbox-item">
                  <input type="checkbox" checked={form.hasInjury || false} onChange={(e) => setForm({ ...form, hasInjury: e.target.checked })} />
                  <label>Tiene lesión o limitación</label>
                </div>
              </div>
              {form.hasInjury && (
                <div className="field full">
                  <label>Descripción de la lesión</label>
                  <textarea className="input" value={form.injuryDescription || ''} onChange={(e) => setForm({ ...form, injuryDescription: e.target.value })} />
                </div>
              )}
              <div className="field">
                <div className="checkbox-item">
                  <input type="checkbox" checked={form.medicalClearance !== false} onChange={(e) => setForm({ ...form, medicalClearance: e.target.checked })} />
                  <label>Apto para entrenar</label>
                </div>
              </div>
              <div className="full">
                <button className="btn btn-primary" type="submit">Guardar</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
