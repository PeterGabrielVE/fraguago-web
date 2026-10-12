'use client';
import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CalendarCheck2, ShoppingBag, Users, Wallet } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReportPanel from '@/components/reports/ReportPanel';
import FinanceReportView from '@/components/reports/FinanceReportView';
import MembersReportView from '@/components/reports/MembersReportView';
import AttendanceReportView from '@/components/reports/AttendanceReportView';
import SalesReportView from '@/components/reports/SalesReportView';
import { useT } from '@/components/I18nProvider';
import {
  MAX_RANGE_DAYS,
  RANGE_PRESETS,
  REPORT_TABS,
  presetRange,
  rangeError,
  type AttendanceReport,
  type FinanceReport,
  type MembersReport,
  type RangePreset,
  type ReportTab,
  type SalesReport,
} from '@/lib/reports';

const TAB_ICONS = { finances: Wallet, members: Users, attendance: CalendarCheck2, sales: ShoppingBag } as const;
const DEFAULT_PRESET: RangePreset = 'thisMonth';
const CUSTOM = 'custom';

const isTab = (value: string | null): value is ReportTab => REPORT_TABS.includes(value as ReportTab);
const isPreset = (value: string | null): value is RangePreset => RANGE_PRESETS.includes(value as RangePreset);

export default function ReportsPage() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // La pestaña y el periodo viven en la URL: el reporte se puede recargar o compartir.
  const tab = isTab(params.get('tab')) ? (params.get('tab') as ReportTab) : 'finances';
  const rangeParam = params.get('range');
  const custom = rangeParam === CUSTOM;
  const preset = isPreset(rangeParam) ? rangeParam : DEFAULT_PRESET;
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';

  const range = useMemo(() => (custom ? { from, to } : presetRange(preset)), [custom, from, to, preset]);
  const error = custom ? rangeError(range) : null;

  function setParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    router.replace(`${pathname}?${next}`, { scroll: false });
  }

  function choosePreset(value: string) {
    // Al pasar a "personalizado" se parte del periodo que ya se estaba viendo.
    if (value === CUSTOM) setParams({ range: CUSTOM, from: range.from, to: range.to });
    else setParams({ range: value, from: null, to: null });
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">{t('reports.eyebrow')}</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t('reports.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('reports.subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            {t('reports.range.label')}
            <NativeSelect value={custom ? CUSTOM : preset} onChange={(e) => choosePreset(e.target.value)}>
              {RANGE_PRESETS.map((option) => (
                <NativeSelectOption key={option} value={option}>{t(`reports.range.${option}`)}</NativeSelectOption>
              ))}
              <NativeSelectOption value={CUSTOM}>{t('reports.range.custom')}</NativeSelectOption>
            </NativeSelect>
          </label>
          {custom && (
            <>
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                {t('reports.range.from')}
                <Input type="date" value={from} max={to || undefined} onChange={(e) => setParams({ from: e.target.value })} aria-invalid={Boolean(error)} />
              </label>
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                {t('reports.range.to')}
                <Input type="date" value={to} min={from || undefined} onChange={(e) => setParams({ to: e.target.value })} aria-invalid={Boolean(error)} />
              </label>
            </>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => setParams({ tab: String(value) })} className="flex-col gap-4">
        <div className="fraguago-scrollbar overflow-x-auto">
          <TabsList className="h-10">
            {REPORT_TABS.map((key) => {
              const Icon = TAB_ICONS[key];
              return (
                <TabsTrigger key={key} value={key} className="px-3">
                  <Icon />
                  {t(`reports.tabs.${key}`)}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t(`reports.range.${error}`, { days: MAX_RANGE_DAYS })}</AlertDescription>
          </Alert>
        ) : (
          <>
            <TabsContent value="finances">
              <ReportPanel<FinanceReport> tab="finances" range={range}>{(data) => <FinanceReportView data={data} />}</ReportPanel>
            </TabsContent>
            <TabsContent value="members">
              <ReportPanel<MembersReport> tab="members" range={range}>{(data) => <MembersReportView data={data} />}</ReportPanel>
            </TabsContent>
            <TabsContent value="attendance">
              <ReportPanel<AttendanceReport> tab="attendance" range={range}>{(data) => <AttendanceReportView data={data} />}</ReportPanel>
            </TabsContent>
            <TabsContent value="sales">
              <ReportPanel<SalesReport> tab="sales" range={range}>{(data) => <SalesReportView data={data} />}</ReportPanel>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
