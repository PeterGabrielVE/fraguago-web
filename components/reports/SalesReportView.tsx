'use client';
import { Package, Receipt, ShoppingBag, Ticket } from 'lucide-react';
import { RankedBarList } from '@/components/RankedBarList';
import { SeriesChart } from '@/components/reports/report-charts';
import { ReportKpi, ReportKpiGrid, ReportSection, ReportToolbar } from '@/components/reports/report-ui';
import { useT } from '@/components/I18nProvider';
import { PAYMENT_METHOD_LABELS, formatMoney } from '@/lib/currency';
import { downloadCsv } from '@/lib/files';
import { formatBucket, type SalesReport } from '@/lib/reports';

export default function SalesReportView({ data }: { data: SalesReport }) {
  const t = useT();
  const money = (value: number) => formatMoney(value, data.currency);
  const { totals, previous } = data;

  function exportCsv() {
    downloadCsv(
      `reporte-ventas_${data.range.from}_${data.range.to}.csv`,
      [t('reports.date'), t('reports.sales.revenue')],
      data.series.map((p) => [formatBucket(p.date, data.granularity), p.value]),
    );
  }

  return (
    <div className="space-y-4">
      <ReportToolbar range={data.range} granularity={data.granularity} onExport={exportCsv} />

      <ReportKpiGrid>
        <ReportKpi
          label={t('reports.sales.revenue')}
          value={money(totals.revenue)}
          icon={ShoppingBag}
          compare={{ current: totals.revenue, previous: previous.revenue }}
        />
        <ReportKpi
          label={t('reports.sales.tickets')}
          value={totals.count.toLocaleString()}
          icon={Ticket}
          compare={{ current: totals.count, previous: previous.count }}
        />
        <ReportKpi
          label={t('reports.sales.avgTicket')}
          value={totals.count ? money(totals.revenue / totals.count) : '—'}
          icon={Receipt}
          hint={t('reports.sales.avgTicketHint')}
        />
        <ReportKpi
          label={t('reports.sales.units')}
          value={totals.units.toLocaleString()}
          icon={Package}
          hint={t('reports.sales.unitsHint')}
        />
      </ReportKpiGrid>

      <ReportSection title={t('reports.sales.trend')}>
        <SeriesChart series={data.series} granularity={data.granularity} label={t('reports.sales.revenue')} format={money} />
      </ReportSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <ReportSection title={t('reports.sales.topProducts')}>
          <RankedBarList
            items={data.topProducts.map((row) => ({
              label: row.product || '—',
              value: row.revenue,
              caption: t('reports.sales.units', { count: row.units }),
            }))}
            valueLabel={money}
            emptyLabel={t('reports.noData')}
          />
        </ReportSection>
        <ReportSection title={t('reports.sales.byPaymentMethod')}>
          <RankedBarList
            items={data.byPaymentMethod.map((row) => ({
              label: row.method ? PAYMENT_METHOD_LABELS[row.method] ?? row.method : t('reports.finances.noMethod'),
              value: row.total,
              caption: t('reports.sales.tickets', { count: row.count }),
            }))}
            valueLabel={money}
            emptyLabel={t('reports.noData')}
          />
        </ReportSection>
      </div>
    </div>
  );
}
