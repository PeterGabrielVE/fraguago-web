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
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/members')
      .then(setMembers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function loadHealth(memberId: string) {
    setError('');
    if (!memberId) { setHealth(null); setForm({}); setOpen(false); return; }
    try {
      const h = await api.get(`/health-profiles?memberId=${memberId}`);
      const data = Array.isArray(h) ? h[0] : h;
      setHealth(data || null);
      setForm(data ? { ...data } : {});
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        hypertension: form.hypertension || false,
        diabetes: form.diabetes || false,
        heartProblems: form.heartProblems || false,
        asthma: form.asthma || false,
        otherConditions: form.otherConditions || undefined,
        hasInjury: form.hasInjury || false,
        injuryDescription: form.hasInjury ? (form.injuryDescription || undefined) : undefined,
        takesMedication: form.takesMedication || false,
        medicationDescription: form.takesMedication ? (form.medicationDescription || undefined) : undefined,
      };
      await api.put(`/health-profiles?memberId=${selected}`, payload);
      setOpen(false);
      await loadHealth(selected);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const set = (k: string) => (e: any) =>
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div className="fm-wrap">
      <style>{fmCss}</style>

      <div className="fm-head">
        <div>
          <h1 className="fm-title">Ficha Médica</h1>
          <p className="fm-sub">Datos de salud y condiciones médicas de los socios.</p>
        </div>
      </div>

      {error && <div className="fm-error">{error}</div>}

      {loading ? (
        <div className="fm-card fm-muted">Cargando…</div>
      ) : (
        <>
          <div className="fm-card fm-selectrow">
            <select
              className="fm-input"
              value={selected}
              onChange={(e) => { setSelected(e.target.value); loadHealth(e.target.value); }}
            >
              <option value="">Selecciona un socio…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.user?.profile?.firstName} {m.user?.profile?.lastName}
                </option>
              ))}
            </select>
            {selected && (
              <button
                className={`fm-btn ${open ? 'fm-btn-ghost' : 'fm-btn-amber'}`}
                onClick={() => setOpen(!open)}
              >
                {open ? 'Cancelar' : (health ? 'Editar' : 'Crear ficha')}
              </button>
            )}
          </div>

          {selected && !health && !open && (
            <div className="fm-card fm-muted">Este socio aún no tiene ficha médica registrada.</div>
          )}

          {selected && health && !open && (
            <div className="fm-card">
              <h2 className="fm-h2">Información Actual</h2>
              <div className="fm-grid">
                <Stat label="Hipertensión" on={health.hypertension} />
                <Stat label="Diabetes" on={health.diabetes} />
                <Stat label="Problemas cardiacos" on={health.heartProblems} />
                <Stat label="Asma" on={health.asthma} />
              </div>
              {(health.otherConditions || health.hasInjury || health.takesMedication) && (
                <div className="fm-notes">
                  {health.otherConditions && <p><strong>Otras condiciones:</strong> {health.otherConditions}</p>}
                  {health.hasInjury && <p><strong>Lesión / limitación:</strong> {health.injuryDescription || 'Sí'}</p>}
                  {health.takesMedication && <p><strong>Medicación continua:</strong> {health.medicationDescription || 'Sí'}</p>}
                </div>
              )}
            </div>
          )}

          {open && selected && (
            <div className="fm-card">
              <h2 className="fm-h2">{health ? 'Editar Ficha Médica' : 'Nueva Ficha Médica'}</h2>
              <form onSubmit={save}>
                <div className="fm-grid">
                  <Check label="Hipertensión" checked={form.hypertension} onChange={set('hypertension')} />
                  <Check label="Diabetes" checked={form.diabetes} onChange={set('diabetes')} />
                  <Check label="Problemas cardiacos" checked={form.heartProblems} onChange={set('heartProblems')} />
                  <Check label="Asma" checked={form.asthma} onChange={set('asthma')} />
                </div>

                <div className="fm-field">
                  <label className="fm-label">Otras condiciones</label>
                  <textarea
                    className="fm-input fm-textarea"
                    value={form.otherConditions || ''}
                    onChange={set('otherConditions')}
                    placeholder="Describe otras condiciones si existen…"
                  />
                </div>

                <div className="fm-divider" />

                <Check label="Tiene lesión o limitación" checked={form.hasInjury} onChange={set('hasInjury')} />
                {form.hasInjury && (
                  <div className="fm-field">
                    <label className="fm-label">Descripción de la lesión</label>
                    <textarea className="fm-input fm-textarea" value={form.injuryDescription || ''} onChange={set('injuryDescription')} />
                  </div>
                )}

                <Check label="Toma medicación de uso continuo" checked={form.takesMedication} onChange={set('takesMedication')} />
                {form.takesMedication && (
                  <div className="fm-field">
                    <label className="fm-label">Descripción de la medicación</label>
                    <textarea className="fm-input fm-textarea" value={form.medicationDescription || ''} onChange={set('medicationDescription')} />
                  </div>
                )}

                <div className="fm-actions">
                  <button className="fm-btn fm-btn-amber" type="submit" disabled={saving}>
                    {saving ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Check({ label, checked, onChange }: any) {
  return (
    <label className="fm-check">
      <input type="checkbox" checked={!!checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

function Stat({ label, on }: { label: string; on: boolean }) {
  return (
    <div className={`fm-stat ${on ? 'is-on' : ''}`}>
      <span className="fm-dot">{on ? '✓' : '–'}</span>
      <span>{label}</span>
    </div>
  );
}

const fmCss = `
.fm-wrap { padding: 28px 32px; max-width: 900px; color: #1f2937;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
.fm-head { margin-bottom: 20px; }
.fm-title { font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.02em; }
.fm-sub { color: #6b7280; margin: 4px 0 0; font-size: 14px; }
.fm-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
  padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }
.fm-muted { color: #6b7280; font-size: 14px; }
.fm-h2 { font-size: 18px; font-weight: 600; margin: 0 0 18px; }
.fm-selectrow { display: flex; gap: 12px; align-items: center; }
.fm-input { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db;
  border-radius: 8px; font-size: 14px; background: #fff; color: #1f2937; outline: none; }
.fm-input:focus { border-color: #ea580c; box-shadow: 0 0 0 3px rgba(234,88,12,0.12); }
.fm-selectrow .fm-input { max-width: 320px; }
.fm-textarea { min-height: 72px; resize: vertical; font-family: inherit; }
.fm-field { margin: 14px 0; }
.fm-label { display: block; font-size: 13px; font-weight: 500; color: #374151; margin-bottom: 6px; }
.fm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
.fm-check { display: flex; align-items: center; gap: 10px; font-size: 14px;
  padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; background: #fafafa; }
.fm-check input { width: 16px; height: 16px; accent-color: #ea580c; cursor: pointer; }
.fm-divider { height: 1px; background: #e5e7eb; margin: 18px 0; }
.fm-stat { display: flex; align-items: center; gap: 10px; font-size: 14px;
  padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
.fm-stat.is-on { background: #f0fdf4; border-color: #bbf7d0; }
.fm-dot { display: inline-flex; align-items: center; justify-content: center;
  width: 22px; height: 22px; border-radius: 999px; font-size: 12px; font-weight: 700;
  background: #e5e7eb; color: #6b7280; }
.fm-stat.is-on .fm-dot { background: #16a34a; color: #fff; }
.fm-notes { margin-top: 16px; font-size: 14px; color: #374151; }
.fm-notes p { margin: 6px 0; }
.fm-actions { margin-top: 20px; }
.fm-btn { border: none; border-radius: 8px; padding: 10px 20px; font-size: 14px;
  font-weight: 600; cursor: pointer; transition: filter .15s, background .15s; }
.fm-btn:disabled { opacity: .6; cursor: default; }
.fm-btn-amber { background: #ea580c; color: #fff; }
.fm-btn-amber:hover:not(:disabled) { filter: brightness(0.94); }
.fm-btn-ghost { background: #fff; color: #374151; border: 1px solid #d1d5db; }
.fm-btn-ghost:hover { background: #f9fafb; }
.fm-error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c;
  padding: 12px 16px; border-radius: 8px; font-size: 14px; margin-bottom: 16px; }
`;
