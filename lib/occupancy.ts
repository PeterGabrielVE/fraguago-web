export type OccupancyStatus = 'UNLIMITED' | 'AVAILABLE' | 'BUSY' | 'FULL';

export type Occupancy = {
  current: number;
  capacity: number | null;
  available: number | null;
  percentage: number | null;
  status: OccupancyStatus;
  avgVisitMinutes: number;
  updatedAt: string;
};

export type OccupancyEntry = {
  id: string;
  memberId: string;
  checkedInAt: string;
  member?: { id: string; user?: { profile?: { firstName?: string; lastName?: string } } };
};

// Vista del staff: incluye quién está dentro.
export type OccupancyDetail = Occupancy & { inside: OccupancyEntry[] };

export const OCCUPANCY_STATUS: Record<OccupancyStatus, { label: string; badge: string; bar: string }> = {
  UNLIMITED: { label: 'Sin límite', badge: 'bg-slate-100 text-slate-700', bar: 'bg-slate-400' },
  AVAILABLE: { label: 'Disponible', badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500' },
  BUSY: { label: 'Concurrido', badge: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500' },
  FULL: { label: 'Lleno', badge: 'bg-red-100 text-red-700', bar: 'bg-red-500' },
};
