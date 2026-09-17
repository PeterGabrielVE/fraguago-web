export const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  expiring: 'Por vencer',
  expired: 'Vencida',
  cancelled: 'Cancelada',
  canceled: 'Cancelada',
  pending: 'Pendiente',
  suspended: 'Suspendida',
};

export const MEMBERSHIP_STATUS_BADGES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  expiring: 'bg-amber-100 text-amber-700',
  expired: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-600',
  canceled: 'bg-slate-100 text-slate-600',
  pending: 'bg-blue-100 text-blue-700',
  suspended: 'bg-red-100 text-red-700',
};

// El campo `status` en la BD casi siempre queda en "active" (nada lo marca
// vencido automáticamente); calculamos el estado real a partir de endDate.
export function effectiveMembershipStatus(row: { status?: string; endDate: string | Date }): string {
  if (row.status && row.status !== 'active') return row.status;
  const end = new Date(row.endDate);
  const now = new Date();
  if (end < now) return 'expired';
  const in7 = new Date(now);
  in7.setDate(in7.getDate() + 7);
  if (end <= in7) return 'expiring';
  return 'active';
}
