'use client';
import { Gift, Power } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import {
  REWARD_TYPE_OPTIONS,
  formatPoints,
  rewardValueLabel,
  type Reward,
} from '@/lib/gamification';

// GAM-01 (staff) — catálogo de recompensas canjeables con puntos.
export default function Page() {
  return (
    <ResourceManager
      title="Recompensas" subtitle="Catálogo que los socios canjean con sus puntos."
      icon={Gift}
      endpoint="/gamification/rewards"
      formVariant="modal"
      columns={[
        { key: 'name', label: 'Nombre' },
        { key: 'type', label: 'Beneficio', render: (row: Reward) => rewardValueLabel(row) },
        { key: 'pointsCost', label: 'Costo', render: (row: Reward) => `${formatPoints(row.pointsCost)} pts` },
        { key: 'stock', label: 'Stock', render: (row: Reward) => (row.stock === null ? 'Ilimitado' : row.stock) },
        {
          key: 'validUntil', label: 'Vigencia',
          render: (row: Reward) => (row.validUntil ? new Date(row.validUntil).toLocaleDateString('es-MX') : 'Sin vencimiento'),
        },
        {
          key: 'active', label: 'Estado',
          render: (row: Reward) => (
            <Badge variant="outline" className={row.active ? 'border-transparent bg-emerald-100 text-emerald-700' : 'border-transparent bg-slate-100 text-slate-500'}>
              {row.active ? 'Activa' : 'Inactiva'}
            </Badge>
          ),
        },
      ]}
      fields={[
        { name: 'name', label: 'Nombre', required: true },
        { name: 'type', label: 'Tipo', type: 'select', required: true, options: REWARD_TYPE_OPTIONS },
        { name: 'value', label: 'Valor (% o monto, solo descuentos)', type: 'number' },
        { name: 'pointsCost', label: 'Costo en puntos', type: 'number', required: true },
        { name: 'stock', label: 'Stock (vacío = ilimitado)', type: 'number' },
        { name: 'minLifetimePoints', label: 'Puntos acumulados mínimos (nivel)', type: 'number' },
        { name: 'validUntil', label: 'Válida hasta', type: 'date' },
        { name: 'description', label: 'Descripción', type: 'textarea', fullWidth: true },
      ]}
      getEditValues={(row) => ({
        name: row.name,
        type: row.type,
        value: row.value ?? '',
        pointsCost: row.pointsCost,
        stock: row.stock ?? '',
        minLifetimePoints: row.minLifetimePoints ?? '',
        validUntil: row.validUntil ? String(row.validUntil).slice(0, 10) : '',
        description: row.description ?? '',
      })}
      validate={(form) => {
        if (form.type === 'DISCOUNT_PERCENT') {
          const v = Number(form.value);
          if (!form.value || v < 1 || v > 100) return 'Un descuento porcentual requiere un valor entre 1 y 100.';
        }
        if (form.type === 'DISCOUNT_AMOUNT' && !(Number(form.value) > 0)) {
          return 'Un descuento de monto fijo requiere un valor mayor a 0.';
        }
        return null;
      }}
      extraActions={(row) => [
        {
          label: row.active ? 'Desactivar' : 'Activar',
          icon: Power,
          confirm: true,
          confirmTitle: row.active ? 'Desactivar recompensa' : 'Activar recompensa',
          confirmDescription: row.active
            ? `"${row.name}" dejará de aparecer en el catálogo de los socios. Los canjes existentes no se afectan.`
            : `"${row.name}" volverá a aparecer en el catálogo de los socios.`,
          onClick: () => api.patch(`/gamification/rewards/${row.id}`, { active: !row.active }),
        },
      ]}
    />
  );
}
