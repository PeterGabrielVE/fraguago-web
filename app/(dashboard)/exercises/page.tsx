'use client';
import { ListChecks } from 'lucide-react';
import ResourceManager from '@/components/ResourceManager';
import { useT } from '@/components/I18nProvider';

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
  const t = useT();
  return (
    <ResourceManager
      title={t('catalog.exercises.title')}
      subtitle={t('catalog.exercises.subtitle')}
      icon={ListChecks}
      endpoint="/exercises"
      formVariant="modal"
      columns={[
        { key: 'name', label: t('catalog.exercises.exercise') },
        { key: 'muscleGroup', label: t('catalog.exercises.muscleGroup'), render: (r: ExerciseRow) => r.muscleGroup || '—' },
        { key: 'equipment', label: t('catalog.exercises.equipment'), render: (r: ExerciseRow) => r.equipment || '—' },
        { key: '_count', label: t('catalog.exercises.inRoutines'), render: (r: ExerciseRow) => r._count?.routineExercises ?? 0 },
      ]}
      fields={[
        { name: 'name', label: t('catalog.field.name'), required: true },
        { name: 'muscleGroup', label: t('catalog.exercises.muscleGroup') },
        { name: 'equipment', label: t('catalog.exercises.equipmentField') },
        { name: 'description', label: t('catalog.exercises.descriptionField'), type: 'textarea', fullWidth: true },
      ]}
      getEditValues={(row) => ({
        name: row.name,
        muscleGroup: row.muscleGroup ?? '',
        equipment: row.equipment ?? '',
        description: row.description ?? '',
      })}
      validate={(form) => (String(form.name ?? '').trim().length < 2 ? t('catalog.exercises.nameTooShort') : null)}
    />
  );
}
