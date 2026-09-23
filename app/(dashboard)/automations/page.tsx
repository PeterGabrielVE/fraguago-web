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
  DEFAULT_INACTIVITY_BODY,
  TRIGGER_LABELS,
  TRIGGER_OPTIONS,
  triggerRule,
  type AutomatedMessage,
  type MessagePreview,
  type RetentionConfig,
  type RunResult,
} from '@/lib/retention';

const PLACEHOLDER_RE = /\{\{\s*([a-z_]+)\s*\}\}/g;

function ChannelStatus({ config }: { config: RetentionConfig | null }) {
  if (!config) return null;
  return (
    <div className="flex items-center gap-2 text-xs">
      {(Object.keys(CHANNEL_LABELS) as (keyof typeof CHANNEL_LABELS)[]).map((ch) => (
        <span
          key={ch}
          title={config.channels[ch] ? 'Configurado en el servidor' : 'Sin configurar: los envíos quedarán como "Omitido"'}
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
          <DialogTitle>Vista previa</DialogTitle>
          <DialogDescription>Con datos de ejemplo. Así lo recibirá el socio.</DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {!preview && !error && <div className="h-32 animate-pulse rounded-lg bg-slate-100" />}
        {preview && (
          <div className="space-y-3">
            {preview.unknownVariables.length > 0 && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                Variables no reconocidas: {preview.unknownVariables.map((v) => `{{${v}}}`).join(', ')}
              </p>
            )}
            {preview.subject && (
              <p className="text-sm"><span className="font-semibold text-slate-700">Asunto:</span> {preview.subject}</p>
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
        title="Mensajes automáticos"
        subtitle={`Se envían cada día a las 9:00. Variables: ${variablesHelp}`}
        icon={MessageSquareText}
        endpoint="/retention/automations"
        formVariant="modal"
        headerActions={<ChannelStatus config={config} />}
        columns={[
          { key: 'name', label: 'Nombre' },
          { key: 'trigger', label: 'Cuándo', render: (r: AutomatedMessage) => (
            <span className="text-sm">
              <span className="font-medium">{TRIGGER_LABELS[r.trigger]}</span>
              <span className="block text-xs text-slate-500">{triggerRule(r)}</span>
            </span>
          ) },
          { key: 'channel', label: 'Canal', render: (r: AutomatedMessage) => CHANNEL_LABELS[r.channel] },
          { key: 'cooldownDays', label: 'Reenvío', render: (r: AutomatedMessage) => `Cada ${r.cooldownDays} días máx.` },
          { key: 'lastRunAt', label: 'Última ejecución', render: (r: AutomatedMessage) => (r.lastRunAt ? new Date(r.lastRunAt).toLocaleString('es-MX') : 'Nunca') },
          {
            key: 'active', label: 'Estado',
            render: (r: AutomatedMessage) => (
              <Badge variant="outline" className={r.active ? 'border-transparent bg-emerald-100 text-emerald-700' : 'border-transparent bg-slate-100 text-slate-500'}>
                {r.active ? 'Activo' : 'Pausado'}
              </Badge>
            ),
          },
        ]}
        fields={[
          { name: 'name', label: 'Nombre', required: true, defaultValue: 'Te extrañamos' },
          { name: 'trigger', label: 'Disparador', type: 'select', required: true, options: TRIGGER_OPTIONS, defaultValue: 'INACTIVITY' },
          { name: 'triggerDays', label: 'Días (sin asistir / antes de vencer)', type: 'number', required: true, defaultValue: '4' },
          { name: 'cooldownDays', label: 'No reenviar antes de (días)', type: 'number', defaultValue: '7' },
          { name: 'channel', label: 'Canal', type: 'select', required: true, options: CHANNEL_OPTIONS, defaultValue: 'EMAIL' },
          { name: 'whatsappTemplate', label: 'Plantilla de WhatsApp (solo WhatsApp)' },
          { name: 'subject', label: 'Asunto (email)', fullWidth: true, defaultValue: '¡Te extrañamos en {{gimnasio}}!' },
          { name: 'body', label: 'Mensaje', type: 'textarea', required: true, fullWidth: true, defaultValue: DEFAULT_INACTIVITY_BODY },
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
          if (String(form.name ?? '').trim().length < 3) return 'El nombre debe tener al menos 3 caracteres.';
          const days = Number(form.triggerDays);
          if (!Number.isInteger(days) || days < 1 || days > 365) return 'Los días del disparador deben estar entre 1 y 365.';
          if (form.cooldownDays !== '' && form.cooldownDays !== undefined) {
            const cd = Number(form.cooldownDays);
            if (!Number.isInteger(cd) || cd < 1 || cd > 365) return 'El reenvío debe estar entre 1 y 365 días.';
          }
          if (form.channel === 'EMAIL' && !String(form.subject ?? '').trim()) return 'Los mensajes por email necesitan un asunto.';
          if (form.channel === 'WHATSAPP' && !/^[a-z0-9_]+$/.test(String(form.whatsappTemplate ?? ''))) {
            return 'Indica el nombre de la plantilla aprobada en Meta (minúsculas, números y _).';
          }
          const known = config ? Object.keys(config.variables) : null;
          if (known) {
            const unknown = [...`${form.subject ?? ''} ${form.body ?? ''}`.matchAll(PLACEHOLDER_RE)]
              .map((m) => m[1])
              .filter((v) => !known.includes(v));
            if (unknown.length) return `Variables no reconocidas: ${[...new Set(unknown)].map((v) => `{{${v}}}`).join(', ')}`;
          }
          return null;
        }}
        extraActions={(row) => [
          { label: 'Vista previa', icon: Eye, silent: true, onClick: () => setPreviewTarget(row as AutomatedMessage) },
          {
            label: 'Enviarme una prueba',
            icon: MailCheck,
            silent: true,
            onClick: async () => {
              try {
                const log = await api.post(`/retention/automations/${row.id}/test`, {});
                toast.add({
                  title: log.status === 'SENT' ? `Prueba enviada a ${log.recipient}` : 'La prueba no se envió',
                  description: log.error ?? undefined,
                  type: log.status === 'SENT' ? 'success' : 'error',
                });
              } catch (e: any) {
                toast.add({ title: 'No se pudo enviar la prueba', description: e.message, type: 'error' });
              }
            },
          },
          {
            label: 'Ejecutar ahora',
            icon: Play,
            silent: true,
            onClick: async () => {
              try {
                const r = (await api.post(`/retention/automations/${row.id}/run`, {})) as RunResult;
                toast.add({
                  title: `${r.sent} enviado(s) de ${r.evaluated} candidato(s)`,
                  description: `${r.alreadyNotified} ya avisados · ${r.skipped} omitidos · ${r.failed} fallidos`,
                  type: r.failed > 0 ? 'error' : 'success',
                });
              } catch (e: any) {
                toast.add({ title: 'No se pudo ejecutar', description: e.message, type: 'error' });
              }
            },
          },
          {
            label: row.active ? 'Pausar' : 'Activar',
            icon: row.active ? Power : Send,
            confirm: true,
            confirmTitle: row.active ? 'Pausar mensaje' : 'Activar mensaje',
            confirmDescription: row.active
              ? `"${row.name}" dejará de enviarse en el job diario.`
              : `"${row.name}" se enviará en el próximo job diario a quienes cumplan el disparador.`,
            onClick: () => api.patch(`/retention/automations/${row.id}`, { active: !row.active }),
          },
        ]}
      />
      <PreviewDialog message={previewTarget} onClose={() => setPreviewTarget(null)} />
    </>
  );
}
