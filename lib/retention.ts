// Tipos y helpers de Retención: mensajes automáticos, socios inactivos,
// historial de envíos y referidos. Contrato con fraguago-api: `/retention/**`,
// `/referrals/**` y `/me/referral`.

import { localizedOptions, localizedRecord, tActive } from '@/lib/i18n/client';

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

const CHANNEL_KEYS = { EMAIL: 'labels.channel.EMAIL', WHATSAPP: 'labels.channel.WHATSAPP' } as const;
export const CHANNEL_LABELS: Record<MessageChannel, string> = localizedRecord(CHANNEL_KEYS);
export const CHANNEL_OPTIONS = localizedOptions(CHANNEL_KEYS);

const TRIGGER_KEYS = {
  INACTIVITY: 'labels.trigger.INACTIVITY',
  MEMBERSHIP_EXPIRING: 'labels.trigger.MEMBERSHIP_EXPIRING',
} as const;
export const TRIGGER_LABELS: Record<AutomationTrigger, string> = localizedRecord(TRIGGER_KEYS);
export const TRIGGER_OPTIONS = localizedOptions(TRIGGER_KEYS);

export function triggerRule(m: Pick<AutomatedMessage, 'trigger' | 'triggerDays'>): string {
  return tActive(m.trigger === 'INACTIVITY' ? 'labels.triggerRule.inactivity' : 'labels.triggerRule.expiring', { count: m.triggerDays });
}

export const MESSAGE_STATUS_LABELS: Record<MessageStatus, string> = localizedRecord({
  SENT: 'labels.messageStatus.SENT',
  FAILED: 'labels.messageStatus.FAILED',
  SKIPPED: 'labels.messageStatus.SKIPPED',
});

export const MESSAGE_STATUS_BADGES: Record<MessageStatus, string> = {
  SENT: 'border-transparent bg-emerald-100 text-emerald-700',
  FAILED: 'border-transparent bg-red-100 text-red-700',
  SKIPPED: 'border-transparent bg-slate-100 text-slate-500',
};

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = localizedRecord({
  PENDING: 'labels.referralStatus.PENDING',
  REWARDED: 'labels.referralStatus.REWARDED',
});

export const REFERRAL_STATUS_BADGES: Record<ReferralStatus, string> = {
  PENDING: 'border-transparent bg-amber-100 text-amber-700',
  REWARDED: 'border-transparent bg-emerald-100 text-emerald-700',
};

// Mismo formato que valida el backend (ej. ANA-7K2QX9).
export const REFERRAL_CODE_RE = /^[A-Z]{2,4}-[A-HJ-NP-Z2-9]{6}$/;

// Plantilla sugerida para el mensaje de inasistencia, en el idioma activo.
// Las variables {{...}} las reemplaza el backend al enviar.
export function defaultInactivityBody(): string {
  return tActive('labels.defaultInactivityBody');
}
