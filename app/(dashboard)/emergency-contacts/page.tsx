'use client';
import { useEffect, useState } from 'react';
import { AlertCircle, Phone, Save, ShieldAlert, User } from 'lucide-react';
import { api } from '@/lib/api';
import PhoneField from '@/components/PhoneField';
import { relationshipOptions } from '@/lib/memberOptions';
import { useT } from '@/components/I18nProvider';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
  'focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition';

export default function EmergencyContactsPage() {
  const t = useT();
  const [members, setMembers] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [contact, setContact] = useState<any>(null);
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

  async function loadContact(memberId: string) {
    setError('');
    if (!memberId) { setContact(null); setForm({}); setOpen(false); return; }
    try {
      const data = await api.get(`/members/${memberId}/emergency-contact`);
      setContact(data || null);
      setForm(data ? { ...data } : {});
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
      const payload = {
        name: form.name || '',
        phone: form.phone || '',
        relationship: form.relationship || '',
      };
      await api.put(`/members/${selected}/emergency-contact`, payload);
      setOpen(false);
      await loadContact(selected);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const set = (k: string) => (value: string) => setForm({ ...form, [k]: value });

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{t('records.emergency.title')}</h1>
              <p className="mt-1 text-slate-600">{t('records.emergency.subtitle')}</p>
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
                onChange={(e) => { setSelected(e.target.value); loadContact(e.target.value); }}
              >
                <option value="">{t('records.selectMember')}</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.user?.profile?.firstName} {m.user?.profile?.lastName}
                  </option>
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
                  {open ? t('common.cancel') : (contact ? t('records.edit') : t('records.emergency.add'))}
                </button>
              )}
            </div>
          </div>

          {selected && !contact && !open && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
              {t('records.emergency.empty')}
            </div>
          )}

          {selected && contact && !open && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-slate-900">{t('records.emergency.registered')}</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm">
                  <User className="h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-xs text-slate-500">{t('records.emergency.name')}</p>
                    <p className="font-medium text-slate-800">{contact.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm">
                  <Phone className="h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-xs text-slate-500">{t('records.emergency.phone')}</p>
                    <p className="font-medium text-slate-800">{contact.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-xs text-slate-500">{t('records.emergency.relationship')}</p>
                    <p className="font-medium text-slate-800">{relationshipOptions.find((o) => o.value === contact.relationship)?.label ?? contact.relationship}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {open && selected && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-semibold text-slate-900">{contact ? t('records.emergency.editTitle') : t('records.emergency.newTitle')}</h2>
              <form onSubmit={save} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('records.emergency.contactName')} <span className="text-red-500">*</span></label>
                  <input
                    required
                    value={form.name || ''}
                    onChange={(e) => set('name')(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('records.emergency.phone')} <span className="text-red-500">*</span></label>
                  <PhoneField value={form.phone || ''} onChange={set('phone')} required />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('records.emergency.relationship')} <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={form.relationship || ''}
                    onChange={(e) => set('relationship')(e.target.value)}
                    className={`${inputClass} bg-white`}
                  >
                    <option value="">{t('common.select')}</option>
                    {relationshipOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
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
