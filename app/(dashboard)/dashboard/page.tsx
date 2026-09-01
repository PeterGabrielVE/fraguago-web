'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState('');
  
  useEffect(() => {
    api.get('/reports/dashboard').then(setD).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <div className="topbar"><h1>Dashboard</h1></div>
      <div className="content">
        {error && <div className="error">{error}</div>}
        {!d && !error && <div className="loading"><div className="spinner"></div></div>}
        {d && (
          <>
            <div className="grid grid-4">
              <div className="card stat"><div className="label">Socios activos</div><div className="value">{d.activeMembers || 0}</div></div>
              <div className="card stat"><div className="label">Membresías activas</div><div className="value teal">{d.activeMemberships || 0}</div></div>
              <div className="card stat"><div className="label">Asistencia hoy</div><div className="value">{d.attendanceToday || 0}</div></div>
              <div className="card stat"><div className="label">Balance del mes</div><div className="value amber">${d.month?.balance || 0}</div></div>
            </div>
            <div className="spacer" />
            <div className="grid grid-2">
              <div className="card stat"><div className="label">Ingresos del mes</div><div className="value teal">${d.month?.income || 0}</div></div>
              <div className="card stat"><div className="label">Egresos del mes</div><div className="value" style={{ color: 'var(--danger)' }}>${d.month?.expense || 0}</div></div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
