'use client';
import { Crown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  badgeIcon,
  formatPoints,
  tierColor,
  type GamificationSummary,
} from '@/lib/gamification';
import { useI18n } from '@/components/I18nProvider';

// GAM-F01 — nivel (tier), saldo de puntos, progreso al siguiente nivel e
// insignias del socio. Presentacional: quien lo usa carga el resumen.
export default function GamificationCard({ summary, className }: { summary: GamificationSummary; className?: string }) {
  const { t, intlLocale } = useI18n();
  const { tier, nextTier, pointsBalance, lifetimePoints, pointsToNextTier, progress, badges } = summary;
  const color = tierColor(tier);

  return (
    <div className={cn('overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
            style={{ backgroundColor: color }}
            aria-hidden
          >
            <Crown className="h-7 w-7" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('gamification.card.tier')}</p>
            <p className="text-2xl font-bold text-slate-900">{tier?.name ?? t('gamification.card.noTier')}</p>
            {tier?.benefits && <p className="text-sm text-slate-500">{tier.benefits}</p>}
          </div>
        </div>

        <div className="flex gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('gamification.card.balance')}</p>
            <p className="text-2xl font-bold text-amber-600">{formatPoints(pointsBalance)} <span className="text-sm font-medium text-slate-500">{t('gamification.card.pts')}</span></p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('gamification.card.lifetime')}</p>
            <p className="text-2xl font-bold text-slate-900">{formatPoints(lifetimePoints)}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-4">
        <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-600">
          <span>{tier?.name ?? t('gamification.card.start')}</span>
          <span>
            {nextTier
              ? t('gamification.card.toNext', { points: formatPoints(pointsToNextTier), tier: nextTier.name })
              : t('gamification.card.maxTier')}
          </span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label={t('gamification.card.progressLabel')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.round(progress * 100)}%`, backgroundColor: tierColor(nextTier ?? tier) }}
          />
        </div>
      </div>

      <div className="border-t border-slate-100 px-5 py-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Sparkles className="h-4 w-4 text-amber-600" />
          {t('gamification.card.badges', { count: badges.length })}
        </p>
        {badges.length === 0 ? (
          <p className="text-sm text-slate-500">{t('gamification.card.noBadges')}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {badges.map((mb) => {
              const Icon = badgeIcon(mb.badge.icon);
              return (
                <li
                  key={mb.id}
                  title={`${mb.badge.description ?? mb.badge.name} · ${new Date(mb.awardedAt).toLocaleDateString(intlLocale)}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {mb.badge.name}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
