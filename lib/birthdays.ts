// La fecha de nacimiento llega como ISO a medianoche UTC ("1990-05-10T00:00:00.000Z"):
// se leen año/mes/día en UTC para que no se corra un día en zonas al oeste de UTC.

export type BirthdayRow = {
  memberId: string;
  name: string;
  phone: string | null;
  email: string;
  status: string;
  birthDate: string;
  month: number;
  day: number;
  /** Días hasta el próximo cumpleaños (0 = hoy). */
  daysUntil: number;
  /** Edad que cumple en el próximo cumpleaños. */
  turns: number;
};

function parts(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export function ageFrom(iso: string | null | undefined, today = new Date()): number | null {
  if (!iso) return null;
  const dob = parts(iso);
  if (!dob) return null;
  let age = today.getFullYear() - dob.year;
  const month = today.getMonth() + 1;
  if (month < dob.month || (month === dob.month && today.getDate() < dob.day)) age--;
  return age;
}

/** Mes de nacimiento (1-12) o null. */
export function birthMonth(iso: string | null | undefined): number | null {
  return iso ? parts(iso)?.month ?? null : null;
}

/** "10 de mayo de 1990" en el idioma activo, sin desfase de zona horaria. */
export function formatBirthDate(iso: string | null | undefined, locale: string, options: Intl.DateTimeFormatOptions = { dateStyle: 'long' }): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: 'UTC' }).format(date);
}

/** Nombres de los meses en el idioma activo (enero..diciembre). */
export function monthNames(locale: string): string[] {
  const format = new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' });
  return Array.from({ length: 12 }, (_, i) => format.format(new Date(Date.UTC(2000, i, 1))));
}
