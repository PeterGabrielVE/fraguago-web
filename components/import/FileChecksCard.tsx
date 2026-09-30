'use client';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { FileChecks } from '@/lib/imports';
import { activeIntlLocale } from '@/lib/i18n/client';
import { useT } from '@/components/I18nProvider';

const money = (n: number) => n.toLocaleString(activeIntlLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Verificaciones del archivo: compara el total que trae la planilla con la
// suma de las filas y lista las filas de resumen que no se importan.
export default function FileChecksCard({ checks }: { checks: FileChecks }) {
  const t = useT();
  const { totals, summaryRows } = checks;
  if (!totals && !summaryRows.length) return null;

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      <p className="font-semibold text-slate-900">{t('setup.import.checks.title')}</p>

      {totals && (
        <div
          role="status"
          className={`flex items-start gap-2 rounded-lg px-3 py-2 ${totals.matches ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}
        >
          {totals.matches ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          <div>
            <p>
              {totals.matches ? t('setup.import.checks.match') : t('setup.import.checks.noMatch')}
              {t('setup.import.checks.declares', { row: totals.row })}
              {totals.declaredAmount !== null && <> <strong>${money(totals.declaredAmount)}</strong></>}
              {totals.declaredAmountBs !== null && <>{t('setup.import.checks.and')}<strong>Bs {money(totals.declaredAmountBs)}</strong></>}
              {t('setup.import.checks.sumOf', { count: totals.rowsCounted })}
              {' '}<strong>${money(totals.computedAmount)}</strong>
              {totals.declaredAmountBs !== null && <>{t('setup.import.checks.and')}<strong>Bs {money(totals.computedAmountBs)}</strong></>}.
            </p>
            {!totals.matches && (
              <p className="mt-1 text-xs">{t('setup.import.checks.noMatchHint')}</p>
            )}
          </div>
        </div>
      )}

      {summaryRows.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-slate-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <div>
            <p>{t('setup.import.checks.summaryRows')}</p>
            <ul className="mt-1 list-disc pl-5 text-xs">
              {summaryRows.map((r) => <li key={r.row}>{t('setup.import.checks.summaryRow', { row: r.row, text: r.text })}</li>)}
            </ul>
            <p className="mt-1 text-xs text-slate-500">
              {t('setup.import.checks.expenseHint')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
