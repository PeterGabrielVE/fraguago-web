'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function AttendancePage() {
  const [members, setMembers] = useState<any[]>([]);
  const [today, setToday] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');

  async function loadToday() { setToday(await api.get('/attendance/today')); }
  useEffect(() => {
    api.get('/members').then(setMembers).catch((e) => setError(e.message));
    loadToday().catch((e) => setError(e.message));
  }, []);

  async function checkIn() {
    if (!selected) return;
    setError('');
    try { await api.post('/attendance/check-in', { memberId: selected }); setSelected(''); loadToday(); }
    catch (e: any) { setError(e.message); }
  }

  return (
    <>
      <div className="topbar"><h1>Asistencia</h1></div>
      <div className="content">
        {error && <div className="error">{error}</div>}
        <div className="card section">
          <h2 style={{ marginBottom: 12 }}>Registrar entrada</h2>
          <div className="row" style={{ justifyContent: 'flex-start', gap: 10 }}>
            <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ maxWidth: 320 }}>
              <option value="">Selecciona un socio…</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.user?.profile?.firstName} {m.user?.profile?.lastName}</option>)}
            </select>
            <button className="btn btn-amber" onClick={checkIn} disabled={!selected}>Registrar entrada</button>
          </div>
        </div>
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}><h2>Entradas de hoy ({today.length})</h2></div>
          {today.length === 0 ? <div className="empty">Nadie ha registrado entrada hoy.</div> : (
            <table className="table">
              <thead><tr><th>Socio</th><th>Hora</th></tr></thead>
              <tbody>
                {today.map((a) => (
                  <tr key={a.id}>
                    <td>{a.member?.user?.profile?.firstName || a.memberId}</td>
                    <td>{new Date(a.checkedInAt).toLocaleTimeString('es-MX')}</td>
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
