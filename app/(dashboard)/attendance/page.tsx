'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Clock, AlertCircle, UserCheck, LogIn } from 'lucide-react';

export default function AttendancePage() {
  const [members, setMembers] = useState<any[]>([]);
  const [today, setToday] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function loadToday() { setToday(await api.get('/attendance/today')); }
  useEffect(() => {
    api.get('/members').then(setMembers).catch((e) => setError(e.message));
    loadToday().catch((e) => setError(e.message));
  }, []);

  async function checkIn() {
    if (!selected) return;
    setError('');
    setSubmitting(true);
    try {
      await api.post('/attendance/check-in', { memberId: selected });
      setSelected('');
      await loadToday();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
    'focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition';

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="border-b pb-6">
        <h1 className="text-4xl font-bold text-slate-900">Asistencia</h1>
        <p className="text-slate-600 mt-2">Registra la entrada de tus socios.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Registrar entrada */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <LogIn className="h-5 w-5 text-amber-600" />
          Registrar entrada
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className={`${inputClass} w-full max-w-80`}
          >
            <option value="">Selecciona un socio…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.user?.profile?.firstName} {m.user?.profile?.lastName}
              </option>
            ))}
          </select>
          <button
            onClick={checkIn}
            disabled={!selected || submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserCheck className="h-4 w-4" />
            {submitting ? 'Registrando…' : 'Registrar entrada'}
          </button>
        </div>
      </div>

      {/* Entradas de hoy */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
          <Clock className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-slate-900">
            Entradas de hoy ({today.length})
          </h2>
        </div>
        {today.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            Nadie ha registrado entrada hoy.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-700">Socio</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Hora</th>
                </tr>
              </thead>
              <tbody>
                {today.map((a) => (
                  <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3 text-slate-700">
                      {a.member?.user?.profile?.firstName
                        ? `${a.member.user.profile.firstName} ${a.member.user.profile.lastName ?? ''}`.trim()
                        : a.memberId}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(a.checkedInAt).toLocaleTimeString('es-MX')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}