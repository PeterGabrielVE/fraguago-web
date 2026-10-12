'use client';
import { CreditCard, IdCard, RefreshCw, UserPlus } from 'lucide-react';
import { RankedBarList } from '@/components/RankedBarList';
import { MemberLink } from '@/components/RecordLink';
import { SeriesChart } from '@/components/reports/report-charts';
import { ReportKpi, ReportKpiGrid, ReportSection, ReportToolbar } from '@/components/reports/report-ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useT } from '@/components/I18nProvider';
import { activeIntlLocale } from '@/lib/i18n/client';
import { downloadCsv } from '@/lib/files';
import { formatBucket, formatDate, type MembersReport } from '@/lib/reports';

// Estado del socio: paleta reservada (bueno / neutro / crítico), siempre con su etiqueta.
const STATUS_STYLES = [
  { key: 'ACTIVE', label: 'labels.memberStatus.ACTIVE', className: 'bg-emerald-600' },
  { key: 'INACTIVE', label: 'labels.memberStatus.INACTIVE', className: 'bg-slate-500' },
  { key: 'SUSPENDED', label: 'labels.memberStatus.SUSPENDED', className: 'bg-rose-500' },
] as const;

export default function MembersReportView({ data }: { data: MembersReport }) {
  const t = useT();
  const { renewal, current } = data;
  const renewalRate = renewal.expired
    ? new Intl.NumberFormat(activeIntlLocale(), { style: 'percent', maximumFractionDigits: 0 }).format(renewal.renewed / renewal.expired)
    : '—';

  function exportCsv() {
    downloadCsv(
      `reporte-socios_${data.range.from}_${data.range.to}.csv`,
      [t('reports.date'), t('reports.members.newMembers')],
      data.series.map((p) => [formatBucket(p.date, data.granularity), p.value]),
    );
  }

  return (
    <div className="space-y-4">
      <ReportToolbar range={data.range} granularity={data.granularity} onExport={exportCsv} />

      <ReportKpiGrid>
        <ReportKpi
          label={t('reports.members.newMembers')}
          value={data.newMembers.total.toLocaleString()}
          icon={UserPlus}
          compare={{ current: data.newMembers.total, previous: data.newMembers.previous }}
        />
        <ReportKpi
          label={t('reports.members.membershipsStarted')}
          value={data.membershipsStarted.total.toLocaleString()}
          icon={CreditCard}
          compare={{ current: data.membershipsStarted.total, previous: data.membershipsStarted.previous }}
        />
        <ReportKpi
          label={t('reports.members.renewalRate')}
          value={renewalRate}
          icon={RefreshCw}
          hint={renewal.expired
            ? t('reports.members.renewalHint', { renewed: renewal.renewed, expired: renewal.expired })
            : t('reports.members.noExpired')}
        />
        <ReportKpi
          label={t('reports.members.activeMemberships')}
          value={current.activeMemberships.toLocaleString()}
          icon={IdCard}
          hint={t('reports.members.expiringSoon', { count: current.expiringSoon })}
        />
      </ReportKpiGrid>

      <ReportSection title={t('reports.members.trend')}>
        <SeriesChart series={data.series} granularity={data.granularity} label={t('reports.members.newMembers')} />
      </ReportSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportSection title={t('reports.members.byPlan')}>
          <RankedBarList
            items={data.byPlan.map((row) => ({ label: row.plan, value: row.count }))}
            valueLabel={(v) => t('reports.members.memberships', { count: v })}
            emptyLabel={t('reports.noData')}
          />
        </ReportSection>

        <ReportSection title={t('reports.members.baseTitle')}>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{current.total.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">{t('reports.members.total')}</p>
          <div className="mt-4 flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
            {STATUS_STYLES.filter((s) => current.byStatus[s.key] > 0).map((s) => (
              <div key={s.key} className={s.className} style={{ width: `${(current.byStatus[s.key] / Math.max(1, current.total)) * 100}%` }} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            {STATUS_STYLES.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.className}`} />
                <div>
                  <p className="font-semibold text-foreground tabular-nums">{current.byStatus[s.key].toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{t(s.label)}</p>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>
      </div>

      <ReportSection title={t('reports.members.lapsedTitle')} description={t('reports.members.lapsedHint')}>
        {renewal.lapsedMembers.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            {renewal.expired ? t('reports.members.noLapsed') : t('reports.members.noExpired')}
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('reports.members.colMember')}</TableHead>
                  <TableHead>{t('reports.members.colPlan')}</TableHead>
                  <TableHead className="text-right">{t('reports.members.colExpired')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {renewal.lapsedMembers.map((member) => (
                  <TableRow key={member.memberId}>
                    <TableCell className="font-medium"><MemberLink id={member.memberId}>{member.name}</MemberLink></TableCell>
                    <TableCell className="text-muted-foreground">{member.plan}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatDate(member.endDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {renewal.lapsed > renewal.lapsedMembers.length && (
              <p className="mt-3 text-xs text-muted-foreground">
                {t('reports.members.lapsedShowing', { shown: renewal.lapsedMembers.length, total: renewal.lapsed })}
              </p>
            )}
          </>
        )}
      </ReportSection>
    </div>
  );
}
