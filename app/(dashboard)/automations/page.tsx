'use client';
import { useEffect, useState } from 'react';
import { Eye, MailCheck, MessageSquareText, Play, Power, Send } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import {
  CHANNEL_LABELS,
  CHANNEL_OPTIONS,
  defaultInactivityBody,
  TRIGGER_LABELS,
  TRIGGER_OPTIONS,
  triggerRule,
  type AutomatedMessage,
  type MessagePreview,
  type RetentionConfig,
  type RunResult,
} from '@/lib/retention';
import { useI18n, useT } from '@/components/I18nProvider';

const PLACEHOLDER_RE = /\{\{\s*([a-z_]+)\s*\}\}/g;

function ChannelStatus({ config }: { config: RetentionConfig | null }) {
  const t = useT();
  if (!config) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      {(Object.keys(CHANNEL_LABELS) as (keyof typeof CHANNEL_LABELS)[]).map((ch) => (
        <span
          key={ch}
          title={config.channels[ch] ? t('retention.automations.channelConfigured') : t('retention.automations.channelMissing')}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${
            config.channels[ch] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${config.channels[ch] ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          {CHANNEL_LABELS[ch]}
        </span>
      ))}
    </div>
  );
}

function PreviewDialog({ message, onClose }: { message: AutomatedMessage | null; onClose: () => void }) {
  const t = useT();
  const [preview, setPreview] = useState<MessagePreview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!message) return;
    setPreview(null);
    setError('');
    api.post('/retention/automations/preview', { subject: message.subject ?? undefined, body: message.body })
      .then((p) => setPreview(p as MessagePreview))
      .catch((e) => setError(e.message));
  }, [message]);

  return (
    <Dialog open={Boolean(message)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('retention.automations.previewTitle')}</DialogTitle>
          <DialogDescription>{t('retention.automations.previewDesc')}</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!preview && !error && <div className="h-32 animate-pulse rounded-lg bg-slate-100" />}
        {preview && (
          <div className="space-y-3">
            {preview.unknownVariables.length > 0 && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                {t('retention.automations.unknownVars', { vars: preview.unknownVariables.map((v) => `{{${v}}}`).join(', ') })}
              </p>
            )}
            {preview.subject && (
              <p className="text-sm"><span className="font-semibold text-slate-700">{t('retention.automations.subject')}</span> {preview.subject}</p>
            )}
            <div className="whitespace-pre-line rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800">
              {preview.body}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// RET-B03 — panel para configurar los mensajes automáticos de retención.
export default function Page() {
  const { t, intlLocale } = useI18n();
  const [config, setConfig] = useState<RetentionConfig | null>(null);
  const [previewTarget, setPreviewTarget] = useState<AutomatedMessage | null>(null);

  useEffect(() => {
    api.get('/retention/config').then((c) => setConfig(c as RetentionConfig)).catch(() => {});
  }, []);

  const variablesHelp = config
    ? Object.keys(config.variables).map((v) => `{{${v}}}`).join(' ')
    : '{{nombre}} {{gimnasio}} {{dias_inactivo}} {{ultima_visita}} {{plan}} {{vence}}';

  return (
    <>
      <ResourceManager
        title={t('retention.automations.title')}
        subtitle={t('retention.automations.subtitle', { variables: variablesHelp })}
        icon={MessageSquareText}
        endpoint="/retention/automations"
        formVariant="modal"
        headerActions={<ChannelStatus config={config} />}
        columns={[
          { key: 'name', label: t('retention.automations.name') },
          { key: 'trigger', label: t('retention.automations.when'), render: (r: AutomatedMessage) => (
            <span className="text-sm">
              <span className="font-medium">{TRIGGER_LABELS[r.trigger]}</span>
              <span className="block text-xs text-slate-500">{triggerRule(r)}</span>
            </span>
          ) },
          { key: 'channel', label: t('retention.automations.channel'), render: (r: AutomatedMessage) => CHANNEL_LABELS[r.channel] },
          { key: 'cooldownDays', label: t('retention.automations.resend'), render: (r: AutomatedMessage) => t('retention.automations.resendEvery', { days: r.cooldownDays }) },
          { key: 'lastRunAt', label: t('retention.automations.lastRun'), render: (r: AutomatedMessage) => (r.lastRunAt ? new Date(r.lastRunAt).toLocaleString(intlLocale) : t('retention.automations.never')) },
          {
            key: 'active', label: t('retention.automations.status'),
            render: (r: AutomatedMessage) => (
              <Badge variant="outline" className={r.active ? 'border-transparent bg-emerald-100 text-emerald-700' : 'border-transparent bg-slate-100 text-slate-500'}>
                {r.active ? t('retention.automations.active') : t('retention.automations.paused')}
              </Badge>
            ),
          },
        ]}
        fields={[
          { name: 'name', label: t('retention.automations.name'), required: true, defaultValue: t('retention.automations.defaultName') },
          { name: 'trigger', label: t('retention.automations.trigger'), type: 'select', required: true, options: TRIGGER_OPTIONS, defaultValue: 'INACTIVITY' },
          { name: 'triggerDays', label: t('retention.automations.triggerDays'), type: 'number', required: true, defaultValue: '4' },
          { name: 'cooldownDays', label: t('retention.automations.cooldown'), type: 'number', defaultValue: '7' },
          { name: 'channel', label: t('retention.automations.channel'), type: 'select', required: true, options: CHANNEL_OPTIONS, defaultValue: 'EMAIL' },
          { name: 'whatsappTemplate', label: t('retention.automations.whatsappTemplate') },
          { name: 'subject', label: t('retention.automations.subjectField'), fullWidth: true, defaultValue: t('retention.automations.defaultSubject') },
          { name: 'body', label: t('retention.automations.body'), type: 'textarea', required: true, fullWidth: true, defaultValue: defaultInactivityBody },
        ]}
        getEditValues={(row) => ({
          name: row.name,
          trigger: row.trigger,
          triggerDays: row.triggerDays,
          cooldownDays: row.cooldownDays,
          channel: row.channel,
          whatsappTemplate: row.whatsappTemplate ?? '',
          subject: row.subject ?? '',
          body: row.body,
        })}
        validate={(form) => {
          if (String(form.name ?? '').trim().length < 3) return t('retention.automations.errName');
          const days = Number(form.triggerDays);
          if (!Number.isInteger(days) || days < 1 || days > 365) return t('retention.automations.errTriggerDays');
          if (form.cooldownDays !== '' && form.cooldownDays !== undefined) {
            const cd = Number(form.cooldownDays);
            if (!Number.isInteger(cd) || cd < 1 || cd > 365) return t('retention.automations.errCooldown');
          }
          if (form.channel === 'EMAIL' && !String(form.subject ?? '').trim()) return t('retention.automations.errSubject');
          if (form.channel === 'WHATSAPP' && !/^[a-z0-9_]+$/.test(String(form.whatsappTemplate ?? ''))) {
            return t('retention.automations.errTemplate');
          }
          const known = config ? Object.keys(config.variables) : null;
          if (known) {
            const unknown = [...`${form.subject ?? ''} ${form.body ?? ''}`.matchAll(PLACEHOLDER_RE)]
              .map((m) => m[1])
              .filter((v) => !known.includes(v));
            if (unknown.length) return t('retention.automations.unknownVars', { vars: [...new Set(unknown)].map((v) => `{{${v}}}`).join(', ') });
          }
          return null;
        }}
        extraActions={(row) => [
          { label: t('retention.automations.preview'), icon: Eye, silent: true, onClick: () => setPreviewTarget(row as AutomatedMessage) },
          {
            label: t('retention.automations.sendTest'),
            icon: MailCheck,
            silent: true,
            onClick: async () => {
              try {
                const log = await api.post(`/retention/automations/${row.id}/test`, {});
                toast.add({
                  title: log.status === 'SENT' ? t('retention.automations.testSent', { recipient: log.recipient }) : t('retention.automations.testNotSent'),
                  description: log.error ?? undefined,
                  type: log.status === 'SENT' ? 'success' : 'error',
                });
              } catch (e: any) {
                toast.add({ title: t('retention.automations.testFailed'), description: e.message, type: 'error' });
              }
            },
          },
          {
            label: t('retention.automations.runNow'),
            icon: Play,
            silent: true,
            onClick: async () => {
              try {
                const r = (await api.post(`/retention/automations/${row.id}/run`, {})) as RunResult;
                toast.add({
                  title: t('retention.automations.runResult', { sent: r.sent, evaluated: r.evaluated }),
                  description: t('retention.automations.runDetail', { already: r.alreadyNotified, skipped: r.skipped, failed: r.failed }),
                  type: r.failed > 0 ? 'error' : 'success',
                });
              } catch (e: any) {
                toast.add({ title: t('retention.automations.runFailed'), description: e.message, type: 'error' });
              }
            },
          },
          {
            label: row.active ? t('retention.automations.pause') : t('retention.automations.activate'),
            icon: row.active ? Power : Send,
            confirm: true,
            confirmTitle: row.active ? t('retention.automations.pauseTitle') : t('retention.automations.activateTitle'),
            confirmDescription: row.active
              ? t('retention.automations.pauseDesc', { name: row.name })
              : t('retention.automations.activateDesc', { name: row.name }),
            onClick: () => api.patch(`/retention/automations/${row.id}`, { active: !row.active }),
          },
        ]}
      />
      <PreviewDialog message={previewTarget} onClose={() => setPreviewTarget(null)} />
    </>
  );
}
