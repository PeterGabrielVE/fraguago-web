'use client';
import { CalendarDays } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export default function Page() {
  return <ResourceManager title="Horarios" subtitle="Clases y agenda." icon={CalendarDays} endpoint="/schedules" columns={[{ key: 'title', label: 'Clase' }, { key: 'weekday', label: 'Día', render: (r) => DAYS[r.weekday] }, { key: 'startTime', label: 'Inicio' }]} fields={[{ name: 'title', label: 'Nombre', required: true }, { name: 'weekday', label: 'Día (0-6)', type: 'number', required: true }, { name: 'startTime', label: 'Inicio', required: true }, { name: 'endTime', label: 'Fin', required: true }, { name: 'capacity', label: 'Cupo', type: 'number' }]} />;
}
