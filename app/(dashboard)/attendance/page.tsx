'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import ExportButton from '@/components/ExportButton';
import OccupancyCard from '@/components/OccupancyCard';
import { api } from '@/lib/api';
import { getGymId } from '@/lib/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  AlertCircle,
  Calendar,
  ClipboardCheck,
  Dumbbell,
  Filter,
  MonitorSmartphone,
  Search,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import { SHIFT_LABELS } from '@/lib/portal';
import { useI18n } from '@/components/I18nProvider';

function toISODate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function todayISO() {
  return toISODate(new Date());
}

function memberFullName(m: any) {
  const firstName = m?.user?.profile?.firstName ?? '';
  const lastName = m?.user?.profile?.lastName ?? '';
  return `${firstName} ${lastName}`.trim();
}

function memberInitials(m: any) {
  const name = memberFullName(m);
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map((p: string) => p[0]?.toUpperCase()).join('');
}

export default function AttendancePage() {
  const [gymId, setGymId] = useState<string>();
  const { t, intlLocale } = useI18n();
  const [members, setMembers] = useState<any[]>([]);
  const [entries, setEntries] = useState<any[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(todayISO());
  const [filterShift, setFilterShift] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  async function loadEntries() {
    setEntriesLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '500' });
      if (filterDate) params.set('date', filterDate);
      if (filterShift) params.set('shift', filterShift);
      setEntries(await api.list(`/attendance?${params.toString()}`));
    } finally {
      setEntriesLoading(false);
    }
  }
  useEffect(() => {
    setGymId(getGymId());
    api.list('/members').then(setMembers).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    loadEntries().catch((e) => setError(e.message));
  }, [filterDate, filterShift]);

  const filtersActive = filterDate !== todayISO() || Boolean(filterShift);
  function clearFilters() { setFilterDate(todayISO()); setFilterShift(''); }

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const selectedMember = members.find((m) => m.id === selectedId) ?? null;

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const name = memberFullName(m).toLowerCase();
      const identification = String(m.user?.profile?.identificationNumber ?? '').toLowerCase();
      return name.includes(q) || identification.includes(q) || String(m.id).toLowerCase().includes(q);
    });
  }, [members, query]);

  function selectMember(m: any) {
    setSelectedId(m.id);
    setQuery(memberFullName(m));
    setDropdownOpen(false);
  }

  function clearSelection() {
    setSelectedId('');
    setQuery('');
  }

  async function checkIn() {
    if (!selectedId) return;
    setError('');
    setSubmitting(true);
    try {
      await api.post('/attendance/check-in', { memberId: selectedId });
      clearSelection();
      await loadEntries();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const filterDateLabel = new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${filterDate}T00:00:00`));
  const isToday = filterDate === todayISO();

  return (
    <div className="space-y-6 p-8">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
              <Dumbbell className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{t('attendance.title')}</h1>
              <p className="mt-1 text-slate-600">{t('attendance.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {gymId && (
              <a
                href={`/check-in/${gymId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-amber-300 hover:text-amber-700"
              >
                <MonitorSmartphone className="h-4 w-4" />
                {t('attendance.kioskLink')}
              </a>
            )}
            <ExportButton
              resource="attendance"
              label={t('attendance.exportDay')}
              filters={{ from: filterDate, to: filterDate, shift: filterShift }}
            />
            <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-5 py-3 text-right sm:text-left">
              <div>
                <p className="text-sm font-semibold text-amber-800">{t('attendance.motto1')}</p>
                <p className="text-sm text-amber-700">{t('attendance.motto2')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Registrar entrada */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="flex-1">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <User className="h-5 w-5 text-amber-600" />
              {t('attendance.registerEntry')}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{t('attendance.registerHint')}</p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div ref={boxRef} className="relative w-full max-w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelectedId(''); setDropdownOpen(true); }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder={t('attendance.searchPlaceholder')}
                  className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-9 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                />
                {query && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    aria-label={t('attendance.clearSearch')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {dropdownOpen && (
                  <div className="absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    {filteredMembers.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-slate-500">{t('attendance.noResults')}</p>
                    ) : (
                      filteredMembers.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => selectMember(m)}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-amber-50"
                        >
                          <Avatar size="sm" className="border border-slate-200 bg-slate-100">
                            <AvatarFallback className="bg-slate-200 text-xs text-slate-600">{memberInitials(m)}</AvatarFallback>
                          </Avatar>
                          <span className="text-slate-700">{memberFullName(m) || m.id}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={checkIn}
                disabled={!selectedId || submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UserCheck className="h-4 w-4" />
                {submitting ? t('attendance.registering') : t('attendance.markEntry')}
              </button>
            </div>
          </div>

          {/* Preview del socio seleccionado */}
          <div className="w-full shrink-0 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:w-72">
            {selectedMember ? (
              <div className="flex items-center gap-3">
                <Avatar className="border border-slate-200 bg-white">
                  <AvatarFallback className="bg-amber-100 text-amber-700">{memberInitials(selectedMember)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-slate-900">{memberFullName(selectedMember)}</p>
                  <p className="text-xs text-slate-500">{t('attendance.readyToRegister')}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Dumbbell className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{t('attendance.welcome')}</p>
                  <p className="text-xs text-slate-500">{t('attendance.selectMember')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <OccupancyCard scope="staff" showInside />

      {/* Asistencias registradas */}
      <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:items-start">
        {/* Filtro lateral */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Filter className="h-4 w-4 text-amber-600" />
            {t('attendance.filters')}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('attendance.date')}</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value || todayISO())}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-600">{t('attendance.shift')}</label>
              <select
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              >
                <option value="">{t('attendance.allShifts')}</option>
                <option value="MORNING">{SHIFT_LABELS.MORNING}</option>
                <option value="AFTERNOON">{SHIFT_LABELS.AFTERNOON}</option>
                <option value="NIGHT">{SHIFT_LABELS.NIGHT}</option>
              </select>
            </div>
            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800"
              >
                {t('attendance.clearFilters')}
              </button>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-amber-600" />
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {t(isToday ? 'attendance.todayEntries' : 'attendance.entries', { count: entries.length })}
                </h2>
                <p className="text-xs text-slate-500">
                  {filterShift ? t('attendance.shiftPrefix', { shift: SHIFT_LABELS[filterShift as keyof typeof SHIFT_LABELS]?.toLowerCase() }) : ''}{t('attendance.entriesHint')}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600">
              <Calendar className="h-4 w-4 text-slate-400" />
              {filterDateLabel}
            </span>
          </div>
          {entriesLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <Dumbbell className="h-7 w-7" />
              </div>
              <p className="font-semibold text-slate-700">
                {isToday && !filterShift ? t('attendance.noEntriesToday') : t('attendance.noEntriesFilter')}
              </p>
              <p className="max-w-sm text-sm text-slate-500">{t('attendance.emptyHint')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-4 py-3 font-semibold text-slate-700">{t('attendance.colMember')}</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">{t('attendance.colShift')}</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">{t('attendance.colTime')}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar size="sm" className="border border-slate-200 bg-slate-100">
                            <AvatarFallback className="bg-slate-200 text-xs text-slate-600">
                              {a.member?.user?.profile?.firstName ? memberInitials(a.member) : '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-slate-700">
                            {a.member?.user?.profile?.firstName
                              ? `${a.member.user.profile.firstName} ${a.member.user.profile.lastName ?? ''}`.trim()
                              : a.memberId}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{SHIFT_LABELS[a.shift as keyof typeof SHIFT_LABELS] ?? a.shift ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(a.checkedInAt).toLocaleTimeString(intlLocale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
