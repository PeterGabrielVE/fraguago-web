'use client';
import { useT } from '@/components/I18nProvider';
import { NoData } from '@/components/reports/report-ui';
import { weekdayName } from '@/lib/reports';

// Lunes primero; el API indexa los días con 0 = domingo.
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];
const LEGEND_STEPS = [0.15, 0.4, 0.7, 1];

const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

// Magnitud en un solo tono: más visitas = ámbar más opaco. Las celdas sin
// visitas quedan en gris para no confundirse con "pocas".
function cellStyle(value: number, max: number) {
  if (value === 0) return undefined;
  return { backgroundColor: `rgb(217 119 6 / ${0.15 + 0.85 * (value / max)})` };
}

// Visitas por día de la semana y hora de entrada.
export default function AttendanceHeatmap({ heatmap }: { heatmap: number[][] }) {
  const t = useT();
  const activeHours = heatmap.flatMap((row) => row.flatMap((value, hour) => (value > 0 ? [hour] : [])));
  if (activeHours.length === 0) return <NoData />;

  // Solo las horas con actividad: un gimnasio no abre las 24.
  const firstHour = Math.min(...activeHours);
  const hours = Array.from({ length: Math.max(...activeHours) - firstHour + 1 }, (_, i) => firstHour + i);
  const max = Math.max(...heatmap.flat());

  let peak = { weekday: 0, hour: 0, value: -1 };
  heatmap.forEach((row, weekday) => row.forEach((value, hour) => {
    if (value > peak.value) peak = { weekday, hour, value };
  }));

  return (
    <div className="space-y-4">
      <div className="fraguago-scrollbar overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-0.5 text-xs">
          <thead>
            <tr>
              <td />
              {hours.map((hour) => (
                <th key={hour} scope="col" className="pb-1 text-center font-normal text-muted-foreground tabular-nums">
                  {String(hour).padStart(2, '0')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((weekday) => (
              <tr key={weekday}>
                <th scope="row" className="pr-2 text-left font-normal capitalize text-muted-foreground">{weekdayName(weekday)}</th>
                {hours.map((hour) => {
                  const value = heatmap[weekday][hour];
                  const label = `${weekdayName(weekday, 'long')} ${hourLabel(hour)} · ${t('reports.attendance.visits', { count: value })}`;
                  return (
                    <td key={hour} title={label} className="h-7 rounded-[4px] bg-muted" style={cellStyle(value, max)}>
                      <span className="sr-only">{value}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>
          {t('reports.attendance.peak', { day: weekdayName(peak.weekday, 'long'), hour: hourLabel(peak.hour) })}
          {' · '}{t('reports.attendance.visits', { count: peak.value })}
        </p>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {t('reports.attendance.less')}
          <span className="h-3 w-3 rounded-[3px] bg-muted" />
          {LEGEND_STEPS.map((alpha) => (
            <span key={alpha} className="h-3 w-3 rounded-[3px]" style={{ backgroundColor: `rgb(217 119 6 / ${alpha})` }} />
          ))}
          {t('reports.attendance.more')}
        </div>
      </div>
    </div>
  );
}
