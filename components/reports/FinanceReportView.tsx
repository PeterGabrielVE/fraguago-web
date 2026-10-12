'use client';
import { ArrowDownCircle, ArrowUpCircle, Receipt, Wallet } from 'lucide-react';
import { RankedBarList } from '@/components/RankedBarList';
import { FinanceChart } from '@/components/reports/report-charts';
import { ReportKpi, ReportKpiGrid, ReportSection, ReportToolbar } from '@/components/reports/report-ui';
import { useT } from '@/components/I18nProvider';
import { PAYMENT_METHOD_LABELS, formatMoney } from '@/lib/currency';
import { downloadCsv } from '@/lib/files';
import { formatBucket, type FinanceReport } from '@/lib/reports';

export default function FinanceReportView({ data }: { data: FinanceReport }) {
  const t = useT();
  const money = (value: number) => formatMoney(value, data.currency);
  const count = (n: number) => t('reports.finances.count', { count: n });
  const { totals, previous } = data;

  const conceptItems = (rows: FinanceReport['incomeByConcept']) =>
    rows.map((row) => ({ label: row.concept ?? t('reports.finances.noConcept'), value: row.total, caption: count(row.count) }));

  function exportCsv() {
    downloadCsv(
      `reporte-finanzas_${data.range.from}_${data.range.to}.csv`,
      [t('reports.date'), t('reports.finances.income'), t('reports.finances.expense'), t('reports.finances.balance')],
      data.series.map((p) => [formatBucket(p.date, data.granularity), p.income, p.expense, Math.round((p.income - p.expense) * 100) / 100]),
    );
  }

  return (
    <div className="space-y-4">
      <ReportToolbar range={data.range} granularity={data.granularity} onExport={exportCsv} />

      <ReportKpiGrid>
        <ReportKpi
          label={t('reports.finances.income')}
          value={money(totals.income)}
          icon={ArrowUpCircle}
          compare={{ current: totals.income, previous: previous.income }}
        />
        <ReportKpi
          label={t('reports.finances.expense')}
          value={money(totals.expense)}
          icon={ArrowDownCircle}
          compare={{ current: totals.expense, previous: previous.expense, upIsGood: false }}
        />
        <ReportKpi
          label={t('reports.finances.balance')}
          value={money(totals.balance)}
          icon={Wallet}
          compare={{ current: totals.balance, previous: previous.balance }}
        />
        <ReportKpi
          label={t('reports.finances.movements')}
          value={totals.count.toLocaleString()}
          icon={Receipt}
          hint={t('reports.finances.movementsHint')}
        />
      </ReportKpiGrid>

      <ReportSection title={t('reports.finances.trend')}>
        <FinanceChart
          series={data.series}
          granularity={data.granularity}
          labels={{ income: t('reports.finances.income'), expense: t('reports.finances.expense') }}
          format={money}
        />
      </ReportSection>

      <div className="grid gap-4 lg:grid-cols-3">
        <ReportSection title={t('reports.finances.incomeByConcept')}>
          <RankedBarList items={conceptItems(data.incomeByConcept)} valueLabel={money} emptyLabel={t('reports.noData')} />
        </ReportSection>
        <ReportSection title={t('reports.finances.expenseByConcept')}>
          <RankedBarList items={conceptItems(data.expenseByConcept)} valueLabel={money} emptyLabel={t('reports.noData')} />
        </ReportSection>
        <ReportSection title={t('reports.finances.byPaymentMethod')}>
          <RankedBarList
            items={data.byPaymentMethod.map((row) => ({
              label: row.method ? PAYMENT_METHOD_LABELS[row.method] ?? row.method : t('reports.finances.noMethod'),
              value: row.total,
              caption: count(row.count),
            }))}
            valueLabel={money}
            emptyLabel={t('reports.noData')}
          />
        </ReportSection>
      </div>
    </div>
  );
}
