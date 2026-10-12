'use client';
import { CalendarCheck2, Repeat, TrendingUp, Users } from 'lucide-react';
import { RankedBarList } from '@/components/RankedBarList';
import AttendanceHeatmap from '@/components/reports/AttendanceHeatmap';
import { SeriesChart } from '@/components/reports/report-charts';
import { ReportKpi, ReportKpiGrid, ReportSection, ReportToolbar } from '@/components/reports/report-ui';
import { useT } from '@/components/I18nProvider';
import { activeIntlLocale } from '@/lib/i18n/client';
import { downloadCsv } from '@/lib/files';
import { SHIFT_LABELS } from '@/lib/portal';
import { formatBucket, type AttendanceReport } from '@/lib/reports';

const SHIFTS = ['MORNING', 'AFTERNOON', 'NIGHT'] as const;

export default function AttendanceReportView({ data }: { data: AttendanceReport }) {
  const t = useT();
  const { totals, previous } = data;
  const visits = (n: number) => t('reports.attendance.visits', { count: n });
  const average = (value: number) => new Intl.NumberFormat(activeIntlLocale(), { maximumFractionDigits: 1 }).format(value);

  function exportCsv() {
    downloadCsv(
      `reporte-asistencia_${data.range.from}_${data.range.to}.csv`,
      [t('reports.date'), t('reports.attendance.visits')],
      data.series.map((p) => [formatBucket(p.date, data.granularity), p.value]),
    );
  }

  return (
    <div className="space-y-4">
      <ReportToolbar range={data.range} granularity={data.granularity} onExport={exportCsv} />

      <ReportKpiGrid>
        <ReportKpi
          label={t('reports.attendance.visits')}
          value={totals.visits.toLocaleString()}
          icon={CalendarCheck2}
          compare={{ current: totals.visits, previous: previous.visits }}
        />
        <ReportKpi
          label={t('reports.attendance.uniqueMembers')}
          value={totals.uniqueMembers.toLocaleString()}
          icon={Users}
          compare={{ current: totals.uniqueMembers, previous: previous.uniqueMembers }}
        />
        <ReportKpi
          label={t('reports.attendance.avgPerDay')}
          value={average(totals.visits / data.range.days)}
          icon={TrendingUp}
          hint={t('reports.attendance.avgPerDayHint')}
        />
        <ReportKpi
          label={t('reports.attendance.perMember')}
          value={totals.uniqueMembers ? average(totals.visits / totals.uniqueMembers) : '—'}
          icon={Repeat}
          hint={t('reports.attendance.perMemberHint')}
        />
      </ReportKpiGrid>

      <ReportSection title={t('reports.attendance.trend')}>
        <SeriesChart series={data.series} granularity={data.granularity} label={t('reports.attendance.visits')} />
      </ReportSection>

      <ReportSection title={t('reports.attendance.heatmapTitle')} description={t('reports.attendance.heatmapHint')}>
        <AttendanceHeatmap heatmap={data.heatmap} />
      </ReportSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportSection title={t('reports.attendance.byShift')}>
          <RankedBarList
            items={totals.visits ? SHIFTS.map((shift) => ({ label: SHIFT_LABELS[shift], value: data.byShift[shift] })) : []}
            valueLabel={visits}
            emptyLabel={t('reports.noData')}
          />
        </ReportSection>
        <ReportSection title={t('reports.attendance.topMembers')}>
          <RankedBarList
            items={data.topMembers.map((member) => ({ label: member.name || '—', value: member.visits }))}
            valueLabel={visits}
            emptyLabel={t('reports.noData')}
          />
        </ReportSection>
      </div>
    </div>
  );
}
