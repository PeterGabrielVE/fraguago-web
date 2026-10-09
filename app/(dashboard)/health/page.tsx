'use client';
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Filter, Save, Search, Stethoscope } from 'lucide-react';
import { api } from '@/lib/api';
import { useT } from '@/components/I18nProvider';
import type { MessageKey } from '@/lib/i18n/translate';
import { ageFrom } from '@/lib/birthdays';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
  'focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition';

type MedicalProfile = {
  memberId: string;
  hypertension?: boolean;
  diabetes?: boolean;
  heartProblems?: boolean;
  asthma?: boolean;
  otherConditions?: string | null;
  hasInjury?: boolean;
  takesMedication?: boolean;
};

// Criterios de la barra lateral. Los marcados se combinan con Y (el socio debe cumplirlos todos).
const CRITERIA: { key: string; label: MessageKey; test: (p: MedicalProfile) => boolean }[] = [
  { key: 'hypertension', label: 'members.health.hypertension', test: (p) => !!p.hypertension },
  { key: 'diabetes', label: 'members.health.diabetes', test: (p) => !!p.diabetes },
  { key: 'heartProblems', label: 'members.health.heartProblems', test: (p) => !!p.heartProblems },
  { key: 'asthma', label: 'members.health.asthma', test: (p) => !!p.asthma },
  { key: 'hasInjury', label: 'members.health.hasInjury', test: (p) => !!p.hasInjury },
  { key: 'takesMedication', label: 'records.health.takesMedication', test: (p) => !!p.takesMedication },
  { key: 'otherConditions', label: 'members.health.otherConditions', test: (p) => !!p.otherConditions?.trim() },
];
const hasAnyCondition = (p: MedicalProfile) => CRITERIA.some((c) => c.test(p));

function memberName(m: any) {
  return `${m?.user?.profile?.firstName ?? ''} ${m?.user?.profile?.lastName ?? ''}`.trim();
}

export default function HealthPage() {
  const t = useT();
  const [members, setMembers] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [health, setHealth] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<MedicalProfile[]>([]);
  const [checked, setChecked] = useState<string[]>([]);
  const [anyCondition, setAnyCondition] = useState(false);
  const [withoutProfile, setWithoutProfile] = useState(false);
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [search, setSearch] = useState('');

  function loadProfiles() {
    return api.get('/health-profiles')
      .then((data) => setProfiles(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    Promise.all([api.list('/members').then(setMembers), loadProfiles()])
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const profileByMember = useMemo(() => new Map(profiles.map((p) => [p.memberId, p])), [profiles]);
  const filtering = checked.length > 0 || anyCondition || withoutProfile || Boolean(ageMin || ageMax || search.trim());

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      const p = profileByMember.get(m.id);
      if (withoutProfile) {
        if (p) return false;
      } else if (checked.length || anyCondition) {
        if (!p) return false;
        if (anyCondition && !hasAnyCondition(p)) return false;
        if (!CRITERIA.filter((c) => checked.includes(c.key)).every((c) => c.test(p))) return false;
      }
      if (ageMin || ageMax) {
        const age = ageFrom(m.birthDate);
        if (age === null || (ageMin && age < Number(ageMin)) || (ageMax && age > Number(ageMax))) return false;
      }
      if (q && !`${memberName(m)} ${m.identificationNumber ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [members, profileByMember, checked, anyCondition, withoutProfile, ageMin, ageMax, search]);

  const countFor = (test: (p: MedicalProfile) => boolean) => profiles.filter(test).length;
  const selectedMember = members.find((m) => m.id === selected);

  function clearFilters() {
    setChecked([]);
    setAnyCondition(false);
    setWithoutProfile(false);
    setAgeMin('');
    setAgeMax('');
    setSearch('');
  }

  function selectMember(memberId: string) {
    setSelected(memberId);
    setOpen(false);
    loadHealth(memberId);
  }

  async function loadHealth(memberId: string) {
    setError('');
    if (!memberId) { setHealth(null); setForm({}); setOpen(false); return; }
    try {
      const response = await api.get(`/health-profiles?memberId=${memberId}`);
      const data = Array.isArray(response)
        ? response[0] ?? null
        : (response && typeof response === 'object' && 'data' in response && Array.isArray((response as any).data)
          ? (response as any).data[0] ?? null
          : (response && typeof response === 'object' && 'data' in response && (response as any).data && typeof (response as any).data === 'object'
            ? (response as any).data
            : response ?? null));
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
      await api.patch(`/health-profiles?memberId=${selected}`, payload);
      setOpen(false);
      // También refresca la barra lateral: la ficha pudo entrar o salir de un filtro.
      await Promise.all([loadHealth(selected), loadProfiles()]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const set = (k: string) => (e: any) =>
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
              <Stethoscope className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{t('records.health.title')}</h1>
              <p className="mt-1 text-slate-600">{t('records.health.subtitle')}</p>
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

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          {/* Barra lateral: criterios + socios que coinciden */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Filter className="h-4 w-4 text-amber-600" />{t('birthdays.health.sidebarTitle')}
                </p>
                {filtering && (
                  <button type="button" onClick={clearFilters} className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">
                    {t('birthdays.health.clear')}
                  </button>
                )}
              </div>
              <div className="space-y-0.5">
                {CRITERIA.map((c) => (
                  <FilterCheck
                    key={c.key}
                    label={t(c.label)}
                    count={countFor(c.test)}
                    checked={checked.includes(c.key)}
                    disabled={withoutProfile}
                    onChange={(on) => setChecked(on ? [...checked, c.key] : checked.filter((k) => k !== c.key))}
                  />
                ))}
                <hr className="my-2 border-slate-200" />
                <FilterCheck label={t('birthdays.health.anyCondition')} count={countFor(hasAnyCondition)} checked={anyCondition} disabled={withoutProfile} onChange={setAnyCondition} />
                <FilterCheck label={t('birthdays.health.withoutProfile')} count={members.filter((m) => !profileByMember.has(m.id)).length} checked={withoutProfile} onChange={setWithoutProfile} />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">{t('birthdays.health.matchAll')}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="text-xs font-medium text-slate-600">{t('birthdays.filters.ageFrom')}
                  <input type="number" min={0} max={120} inputMode="numeric" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} className={`${inputClass} mt-1`} />
                </label>
                <label className="text-xs font-medium text-slate-600">{t('birthdays.filters.ageTo')}
                  <input type="number" min={0} max={120} inputMode="numeric" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} className={`${inputClass} mt-1`} />
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('birthdays.health.search')} className={`${inputClass} pl-9`} />
                </div>
                <p className="mt-2 text-xs text-slate-500">{t('birthdays.health.results', { count: filteredMembers.length })}</p>
              </div>
              <ul className="fraguago-scrollbar max-h-112 overflow-y-auto p-1.5">
                {filteredMembers.length === 0 ? (
                  <li className="px-3 py-6 text-center text-sm text-slate-500">{t('birthdays.health.noResults')}</li>
                ) : filteredMembers.map((m) => {
                  const p = profileByMember.get(m.id);
                  const flags = p ? CRITERIA.filter((c) => c.test(p)).map((c) => t(c.label)) : [];
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => selectMember(m.id)}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${selected === m.id ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span className="block font-medium">{memberName(m)}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {!p ? t('birthdays.health.withoutProfile') : flags.length ? flags.join(' · ') : '—'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          <div className="space-y-6">
            {!selected ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
                {t('records.selectMember')}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-lg font-semibold text-slate-900">{memberName(selectedMember)}</p>
                <button
                  type="button"
                  onClick={() => setOpen(!open)}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${open
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                    }`}
                >
                  {open ? t('common.cancel') : (health ? t('records.edit') : t('records.health.create'))}
                </button>
              </div>
            )}

            {selected && !health && !open && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
                {t('records.health.empty')}
              </div>
            )}

            {selected && health && !open && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-lg font-semibold text-slate-900">{t('records.health.current')}</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Stat label={t('members.health.hypertension')} on={health.hypertension} />
                  <Stat label={t('members.health.diabetes')} on={health.diabetes} />
                  <Stat label={t('members.health.heartProblems')} on={health.heartProblems} />
                  <Stat label={t('members.health.asthma')} on={health.asthma} />
                </div>
                {(health.otherConditions || health.hasInjury || health.takesMedication) && (
                  <div className="mt-4 space-y-1.5 text-sm text-slate-700">
                    {health.otherConditions && <p><span className="font-medium">{t('records.health.otherConditions')}</span> {health.otherConditions}</p>}
                    {health.hasInjury && <p><span className="font-medium">{t('records.health.injury')}</span> {health.injuryDescription || t('records.health.yes')}</p>}
                    {health.takesMedication && <p><span className="font-medium">{t('records.health.medication')}</span> {health.medicationDescription || t('records.health.yes')}</p>}
                  </div>
                )}
              </div>
            )}

            {open && selected && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-lg font-semibold text-slate-900">{health ? t('records.health.editTitle') : t('records.health.newTitle')}</h2>
                <form onSubmit={save} className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Check label={t('members.health.hypertension')} checked={form.hypertension} onChange={set('hypertension')} />
                    <Check label={t('members.health.diabetes')} checked={form.diabetes} onChange={set('diabetes')} />
                    <Check label={t('members.health.heartProblems')} checked={form.heartProblems} onChange={set('heartProblems')} />
                    <Check label={t('members.health.asthma')} checked={form.asthma} onChange={set('asthma')} />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('members.health.otherConditions')}</label>
                    <textarea
                      className={`${inputClass} min-h-20`}
                      value={form.otherConditions || ''}
                      onChange={set('otherConditions')}
                      placeholder={t('records.health.otherPlaceholder')}
                    />
                  </div>

                  <hr className="border-slate-200" />

                  <Check label={t('members.health.hasInjury')} checked={form.hasInjury} onChange={set('hasInjury')} />
                  {form.hasInjury && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('members.health.injuryDescription')}</label>
                      <textarea className={`${inputClass} min-h-20`} value={form.injuryDescription || ''} onChange={set('injuryDescription')} />
                    </div>
                  )}

                  <Check label={t('records.health.takesMedication')} checked={form.takesMedication} onChange={set('takesMedication')} />
                  {form.takesMedication && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('members.health.medicationDescription')}</label>
                      <textarea className={`${inputClass} min-h-20`} value={form.medicationDescription || ''} onChange={set('medicationDescription')} />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />{saving ? t('records.saving') : t('common.save')}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterCheck({ label, count, checked, disabled, onChange }: { label: string; count: number; checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 ${disabled ? 'pointer-events-none opacity-40' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-amber-600" />
      <span className="flex-1">{label}</span>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">{count}</span>
    </label>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (e: any) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm text-slate-700">
      <input type="checkbox" checked={!!checked} onChange={onChange} className="h-4 w-4 accent-amber-600" />
      {label}
    </label>
  );
}

function Stat({ label, on }: { label: string; on: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-sm ${on ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}>
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${on ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
        {on ? '✓' : '–'}
      </span>
      {label}
    </div>
  );
}
