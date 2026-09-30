'use client';
import { useEffect, useState } from 'react';
import { AlertCircle, Save, Target } from 'lucide-react';
import { api } from '@/lib/api';
import { localizedOptions, localizedRecord } from '@/lib/i18n/client';
import { useT } from '@/components/I18nProvider';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
  'focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition';

// mismo enum TrainingGoal que usa el backend (prisma/schema.prisma)
const GOAL_KEYS = {
  MUSCLE_GAIN: 'records.goals.options.MUSCLE_GAIN',
  WEIGHT_LOSS: 'records.goals.options.WEIGHT_LOSS',
  GENERAL_WELLNESS: 'records.goals.options.GENERAL_WELLNESS',
  PERFORMANCE_REHABILITATION: 'records.goals.options.PERFORMANCE_REHABILITATION',
} as const;
const GOAL_OPTIONS = localizedOptions(GOAL_KEYS);
const GOAL_LABELS: Record<string, string> = localizedRecord(GOAL_KEYS);

function personLabel(m: any) {
  const firstName = m?.user?.profile?.firstName ?? '';
  const lastName = m?.user?.profile?.lastName ?? '';
  return `${firstName} ${lastName}`.trim();
}

export default function TrainingGoalsPage() {
  const t = useT();
  const [members, setMembers] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [member, setMember] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.list('/members')
      .then(setMembers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function loadMember(memberId: string) {
    setError('');
    if (!memberId) { setMember(null); setForm({}); setOpen(false); return; }
    try {
      const data = await api.get(`/members/${memberId}`);
      setMember(data);
      setForm({ primaryGoal: data.primaryGoal ?? '', goalDescription: data.goalDescription ?? '' });
      setOpen(false);
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
      await api.patch(`/members/${selected}`, {
        primaryGoal: form.primaryGoal || undefined,
        goalDescription: form.goalDescription || undefined,
      });
      setOpen(false);
      await loadMember(selected);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const set = (k: string) => (e: any) => setForm({ ...form, [k]: e.target.value });
  const hasGoal = Boolean(member?.primaryGoal || member?.goalDescription);

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
              <Target className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{t('records.goals.title')}</h1>
              <p className="mt-1 text-slate-600">{t('records.goals.subtitle')}</p>
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
        <>
          {/* Selector de socio */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                className={`${inputClass} sm:max-w-sm`}
                value={selected}
                onChange={(e) => { setSelected(e.target.value); loadMember(e.target.value); }}
              >
                <option value="">{t('records.selectMember')}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{personLabel(m) || m.id}</option>
                ))}
              </select>
              {selected && (
                <button
                  type="button"
                  onClick={() => setOpen(!open)}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${open
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                    }`}
                >
                  {open ? t('common.cancel') : (hasGoal ? t('records.edit') : t('records.goals.define'))}
                </button>
              )}
            </div>
          </div>

          {selected && !hasGoal && !open && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
              {t('records.goals.empty')}
            </div>
          )}

          {selected && hasGoal && !open && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">{t('records.goals.current')}</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm">
                  <Target className="h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-xs text-slate-500">{t('records.goals.primary')}</p>
                    <p className="font-medium text-slate-800">{GOAL_LABELS[member.primaryGoal] ?? '—'}</p>
                  </div>
                </div>
                {member.goalDescription && (
                  <p className="rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-700">{member.goalDescription}</p>
                )}
              </div>
            </div>
          )}

          {open && selected && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-semibold text-slate-900">{hasGoal ? t('records.goals.editTitle') : t('records.goals.newTitle')}</h2>
              <form onSubmit={save} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('records.goals.primary')}</label>
                  <select value={form.primaryGoal || ''} onChange={set('primaryGoal')} className={inputClass}>
                    <option value="">{t('common.select')}</option>
                    {GOAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('records.goals.description')}</label>
                  <textarea
                    className={`${inputClass} min-h-24`}
                    value={form.goalDescription || ''}
                    onChange={set('goalDescription')}
                    placeholder={t('records.goals.descriptionPlaceholder')}
                  />
                </div>
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
        </>
      )}
    </div>
  );
}
