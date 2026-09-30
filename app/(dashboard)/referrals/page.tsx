'use client';
import { useEffect, useRef, useState } from 'react';
import { CircleCheck, CircleX, Loader2, Share2, UserPlus } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import { formatPoints } from '@/lib/gamification';
import {
  REFERRAL_CODE_RE,
  REFERRAL_STATUS_BADGES,
  REFERRAL_STATUS_LABELS,
  type ReferralRow,
  type ReferralValidation,
} from '@/lib/retention';
import { useI18n, useT } from '@/components/I18nProvider';

const LIST = '/referrals?pageSize=100';
// Mismo margen que el backend: solo socios inscritos hace poco.
const WINDOW_DAYS = 30;

type MemberOption = { value: string; label: string };

function RegisterReferralDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [memberId, setMemberId] = useState('');
  const [code, setCode] = useState('');
  const [validation, setValidation] = useState<ReferralValidation | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);

  // Socios nuevos (candidatos a referidos).
  useEffect(() => {
    if (!open) return;
    setMemberId('');
    setCode('');
    setValidation(null);
    const since = Date.now() - WINDOW_DAYS * 86_400_000;
    api.list('/members').then((rows) => {
      setMembers(rows
        .filter((m: any) => !m.joinedAt || new Date(m.joinedAt).getTime() >= since)
        .map((m: any) => ({
          value: String(m.id),
          label: `${m.user?.profile?.firstName ?? ''} ${m.user?.profile?.lastName ?? ''}`.trim() || m.user?.email || m.id,
        })));
    }).catch(() => {});
  }, [open]);

  // Validación en vivo (debounce 400 ms; descarta respuestas viejas).
  useEffect(() => {
    const normalized = code.trim().toUpperCase();
    if (!REFERRAL_CODE_RE.test(normalized)) {
      setValidation(normalized.length >= 9 ? { valid: false, code: normalized, reason: t('retention.referrals.invalidFormat') } : null);
      setChecking(false);
      return;
    }
    const id = ++requestId.current;
    setChecking(true);
    const timer = setTimeout(() => {
      const qs = new URLSearchParams({ code: normalized, ...(memberId ? { memberId } : {}) });
      api.get(`/referrals/validate?${qs}`)
        .then((v) => { if (id === requestId.current) setValidation(v as ReferralValidation); })
        .catch((e) => { if (id === requestId.current) setValidation({ valid: false, code: normalized, reason: e.message }); })
        .finally(() => { if (id === requestId.current) setChecking(false); });
    }, 400);
    return () => clearTimeout(timer);
  }, [code, memberId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validation?.valid || !memberId) return;
    setSaving(true);
    try {
      const res = await api.post('/referrals', { code: code.trim().toUpperCase(), referredMemberId: memberId });
      toast.add({
        title: t('retention.referrals.registeredToast'),
        description: res?.rewardedNow
          ? t('retention.referrals.rewardedNow')
          : t('retention.referrals.rewardLater'),
        type: 'success',
      });
      onDone();
    } catch (err: any) {
      toast.add({ title: t('retention.referrals.registerFailed'), description: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t('retention.referrals.register')}</DialogTitle>
            <DialogDescription>
              {t('retention.referrals.dialogDesc', { days: WINDOW_DAYS })}
            </DialogDescription>
          </DialogHeader>

          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1.5 block">{t('retention.referrals.newMember')} <span className="text-red-500">*</span></span>
            <select required value={memberId} onChange={(e) => setMemberId(e.target.value)} className={`${inputClass} bg-white`}>
              <option value="">{t('common.select')}</option>
              {members.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1.5 block">{t('retention.referrals.codeField')} <span className="text-red-500">*</span></span>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ANA-7K2QX9"
              maxLength={11}
              autoComplete="off"
              aria-invalid={validation ? !validation.valid : undefined}
              aria-describedby="referral-code-status"
              className={`${inputClass} font-mono uppercase tracking-widest`}
            />
          </label>

          <div id="referral-code-status" aria-live="polite" className="min-h-6 text-sm">
            {checking && <span className="inline-flex items-center gap-1.5 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{t('retention.referrals.validating')}</span>}
            {!checking && validation?.valid && (
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <CircleCheck className="h-4 w-4" />{t('retention.referrals.codeOf', { name: validation.referrer?.name })}
                {!memberId && t('retention.referrals.chooseMemberHint')}
              </span>
            )}
            {!checking && validation && !validation.valid && (
              <span className="inline-flex items-center gap-1.5 text-red-600"><CircleX className="h-4 w-4" />{validation.reason}</span>
            )}
          </div>

          <DialogFooter>
            <button
              type="submit"
              disabled={saving || checking || !validation?.valid || !memberId}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-60"
            >
              {saving ? t('retention.referrals.registering') : t('retention.referrals.submit')}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// RET-B04 (staff) — programa de referidos.
export default function Page() {
  const { t, intlLocale } = useI18n();
  const [reloadKey, setReloadKey] = useState(0);
  const [open, setOpen] = useState(false);

  return (
    <>
      <ResourceManager
        key={reloadKey}
        title={t('retention.referrals.title')} subtitle={t('retention.referrals.subtitle')}
        icon={Share2}
        endpoint="/referrals"
        disableCreate
        disableEdit
        disableDelete
        headerActions={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            <UserPlus className="h-4 w-4" />
            {t('retention.referrals.register')}
          </button>
        }
        filters={[
          { label: t('retention.referrals.all'), endpoint: LIST },
          { label: t('retention.referrals.pending'), endpoint: `${LIST}&status=PENDING` },
          { label: t('retention.referrals.rewarded'), endpoint: `${LIST}&status=REWARDED` },
        ]}
        columns={[
          { key: 'referredName', label: t('retention.referrals.newMember') },
          { key: 'referrerName', label: t('retention.referrals.invitedBy') },
          { key: 'code', label: t('retention.referrals.code'), render: (r: ReferralRow) => <span className="font-mono tracking-widest">{r.code}</span> },
          { key: 'createdAt', label: t('retention.referrals.registered'), render: (r: ReferralRow) => new Date(r.createdAt).toLocaleDateString(intlLocale) },
          {
            key: 'status', label: t('retention.referrals.status'),
            render: (r: ReferralRow) => (
              <span>
                <Badge variant="outline" className={REFERRAL_STATUS_BADGES[r.status]}>{REFERRAL_STATUS_LABELS[r.status]}</Badge>
                {r.status === 'REWARDED' && (
                  <span className="block text-xs text-slate-500">
                    +{formatPoints(r.referrerPoints)} / +{formatPoints(r.referredPoints)} pts
                  </span>
                )}
              </span>
            ),
          },
        ]}
        fields={[]}
      />
      <RegisterReferralDialog
        open={open}
        onClose={() => setOpen(false)}
        onDone={() => { setOpen(false); setReloadKey((k) => k + 1); }}
      />
    </>
  );
}
