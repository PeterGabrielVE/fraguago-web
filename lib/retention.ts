// Tipos y helpers de Retención: mensajes automáticos, socios inactivos,
// historial de envíos y referidos. Contrato con fraguago-api: `/retention/**`,
// `/referrals/**` y `/me/referral`.

export type MessageChannel = 'EMAIL' | 'WHATSAPP';
export type AutomationTrigger = 'INACTIVITY' | 'MEMBERSHIP_EXPIRING';
export type MessageStatus = 'SENT' | 'FAILED' | 'SKIPPED';
export type ReferralStatus = 'PENDING' | 'REWARDED';

export type AutomatedMessage = {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  channel: MessageChannel;
  triggerDays: number;
  cooldownDays: number;
  subject: string | null;
  body: string;
  whatsappTemplate: string | null;
  active: boolean;
  lastRunAt: string | null;
  _count?: { logs: number };
};

export type RetentionConfig = {
  channels: Record<MessageChannel, boolean>;
  variables: Record<string, string>;
};

export type RunResult = {
  automationId: string;
  evaluated: number;
  sent: number;
  failed: number;
  skipped: number;
  alreadyNotified: number;
};

export type MessagePreview = { subject: string | null; body: string; unknownVariables: string[] };

export type InactiveMember = {
  memberId: string;
  name: string;
  email: string | null;
  phone: string | null;
  lastAttendance: string | null;
  daysInactive: number;
  plan: string | null;
  membershipEnd: string | null;
  lastNotifiedAt: string | null;
};

export type MessageLog = {
  id: string;
  channel: MessageChannel;
  trigger: AutomationTrigger | null;
  recipient: string;
  subject: string | null;
  body: string;
  status: MessageStatus;
  error: string | null;
  createdAt: string;
  automatedMessage: { id: string; name: string } | null;
  member: { id: string; user?: { profile?: { firstName?: string; lastName?: string } } } | null;
};

export type ReferralValidation = {
  valid: boolean;
  code: string;
  reason?: string;
  referrer?: { id: string; name: string };
};

export type ReferralRow = {
  id: string;
  code: string;
  status: ReferralStatus;
  referrerName: string;
  referredName: string;
  referrerPoints: number;
  referredPoints: number;
  createdAt: string;
  rewardedAt: string | null;
};

export type MyReferral = {
  code: string;
  rewards: { referrerPoints: number; referredPoints: number; windowDays: number };
  totals: { referred: number; rewarded: number; pointsEarned: number };
  referrals: { id: string; name: string; status: ReferralStatus; createdAt: string; rewardedAt: string | null; points: number }[];
};

export const CHANNEL_LABELS: Record<MessageChannel, string> = { EMAIL: 'Email', WHATSAPP: 'WhatsApp' };
export const CHANNEL_OPTIONS = Object.entries(CHANNEL_LABELS).map(([value, label]) => ({ value, label }));

export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  INACTIVITY: 'Inasistencia',
  MEMBERSHIP_EXPIRING: 'Membresía por vencer',
};
export const TRIGGER_OPTIONS = Object.entries(TRIGGER_LABELS).map(([value, label]) => ({ value, label }));

export function triggerRule(m: Pick<AutomatedMessage, 'trigger' | 'triggerDays'>): string {
  return m.trigger === 'INACTIVITY'
    ? `Más de ${m.triggerDays} ${m.triggerDays === 1 ? 'día' : 'días'} sin asistir`
    : `Vence en ${m.triggerDays} ${m.triggerDays === 1 ? 'día' : 'días'} o menos`;
}

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = {
  SENT: 'Enviado',
  FAILED: 'Falló',
  SKIPPED: 'Omitido',
};

export const MESSAGE_STATUS_BADGES: Record<MessageStatus, string> = {
  SENT: 'border-transparent bg-emerald-100 text-emerald-700',
  FAILED: 'border-transparent bg-red-100 text-red-700',
  SKIPPED: 'border-transparent bg-slate-100 text-slate-500',
};

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  PENDING: 'Pendiente',
  REWARDED: 'Premiado',
};

export const REFERRAL_STATUS_BADGES: Record<ReferralStatus, string> = {
  PENDING: 'border-transparent bg-amber-100 text-amber-700',
  REWARDED: 'border-transparent bg-emerald-100 text-emerald-700',
};

// Mismo formato que valida el backend (ej. ANA-7K2QX9).
export const REFERRAL_CODE_RE = /^[A-Z]{2,4}-[A-HJ-NP-Z2-9]{6}$/;

export const DEFAULT_INACTIVITY_BODY =
  '¡Hola {{nombre}}! Hace {{dias_inactivo}} días que no te vemos en {{gimnasio}}. ' +
  'Tu plan {{plan}} sigue activo hasta el {{vence}}: ¡te esperamos para seguir entrenando!';
