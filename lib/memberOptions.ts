import { localizedOptions } from '@/lib/i18n/client';

// Opciones de <select> compartidas por el alta y la ficha del socio. Los valores son los del API.
export { preferredTimeOptions } from '@/lib/portal';

export const activityOptions = localizedOptions({
  BEGINNER: 'labels.activityLevel.BEGINNER',
  INTERMEDIATE: 'labels.activityLevel.INTERMEDIATE',
  ADVANCED: 'labels.activityLevel.ADVANCED',
});

export const relationshipOptions = localizedOptions({
  MADRE: 'labels.relationship.MADRE',
  PADRE: 'labels.relationship.PADRE',
  HERMANO: 'labels.relationship.HERMANO',
  HERMANA: 'labels.relationship.HERMANA',
  HIJO: 'labels.relationship.HIJO',
  HIJA: 'labels.relationship.HIJA',
  PAREJA: 'labels.relationship.PAREJA',
  ESPOSO: 'labels.relationship.ESPOSO',
  ESPOSA: 'labels.relationship.ESPOSA',
  AMIGO: 'labels.relationship.AMIGO',
  AMIGA: 'labels.relationship.AMIGA',
  VECINO: 'labels.relationship.VECINO',
  VECINA: 'labels.relationship.VECINA',
  OTRO: 'labels.relationship.OTRO',
});
