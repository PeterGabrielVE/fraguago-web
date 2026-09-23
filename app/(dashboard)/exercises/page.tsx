'use client';
import { ListChecks } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';

type ExerciseRow = {
  id: string;
  name: string;
  muscleGroup?: string | null;
  equipment?: string | null;
  description?: string | null;
  _count?: { routineExercises: number };
};

// DB-06 — catálogo de ejercicios del gym. Se completa solo al guardar
// rutinas (p. ej. las generadas con IA); aquí se puede ordenar y enriquecer.
export default function Page() {
  return (
    <ResourceManager
      title="Ejercicios"
      subtitle="Catálogo que usan las rutinas. Se agregan solos al guardar una rutina con ejercicios."
      icon={ListChecks}
      endpoint="/exercises"
      formVariant="modal"
      columns={[
        { key: 'name', label: 'Ejercicio' },
        { key: 'muscleGroup', label: 'Grupo muscular', render: (r: ExerciseRow) => r.muscleGroup || '—' },
        { key: 'equipment', label: 'Equipo', render: (r: ExerciseRow) => r.equipment || '—' },
        { key: '_count', label: 'En rutinas', render: (r: ExerciseRow) => r._count?.routineExercises ?? 0 },
      ]}
      fields={[
        { name: 'name', label: 'Nombre', required: true },
        { name: 'muscleGroup', label: 'Grupo muscular' },
        { name: 'equipment', label: 'Equipo (mancuernas, máquina…)' },
        { name: 'description', label: 'Descripción / técnica', type: 'textarea', fullWidth: true },
      ]}
      getEditValues={(row) => ({
        name: row.name,
        muscleGroup: row.muscleGroup ?? '',
        equipment: row.equipment ?? '',
        description: row.description ?? '',
      })}
      validate={(form) => (String(form.name ?? '').trim().length < 2 ? 'El nombre debe tener al menos 2 caracteres.' : null)}
    />
  );
}
