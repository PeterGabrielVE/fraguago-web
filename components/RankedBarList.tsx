export interface RankedBarItem {
  label: string;
  value: number;
  caption?: string;
}

// Ranking de una sola magnitud (plan más usado, producto más vendido): un solo
// hue secuencial, nunca un color por fila (eso gastaría el canal de identidad
// en algo que el largo de la barra ya muestra).
export function RankedBarList({
  items, valueLabel, emptyLabel,
}: { items: RankedBarItem[]; valueLabel: (v: number) => string; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={`${index}-${item.label}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-foreground">{item.label}</span>
            <span className="shrink-0 font-mono text-muted-foreground tabular-nums">{valueLabel(item.value)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-amber-500/10">
            <div
              className="h-full rounded-full bg-amber-600 dark:bg-amber-500"
              style={{ width: `${(Math.max(0, item.value) / max) * 100}%` }}
            />
          </div>
          {item.caption && <p className="mt-1 text-xs text-muted-foreground">{item.caption}</p>}
        </div>
      ))}
    </div>
  );
}
