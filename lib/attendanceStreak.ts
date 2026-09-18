// Objetivo de constancia: asistir al menos estos días (lunes a viernes) cada semana.
export const WEEKLY_ATTENDANCE_GOAL = 4;

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export type AttendanceRecord = { checkedInAt: string | Date };

export type WeekSummary = { weekStart: Date; days: number; goalMet: boolean };

export type AttendanceStreak = {
  streakWeeks: number;
  currentWeekDays: number;
  currentWeekGoalMet: boolean;
  recentWeeks: WeekSummary[];
};

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=domingo .. 6=sábado
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function weekKey(date: Date): string {
  return startOfWeek(date).toISOString().slice(0, 10);
}

function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

// Solo cuentan los días de lunes a viernes: el objetivo es un hábito de entre semana.
function groupBusinessDaysByWeek(records: AttendanceRecord[]): Map<string, Set<number>> {
  const map = new Map<string, Set<number>>();
  for (const record of records) {
    const date = new Date(record.checkedInAt);
    if (!isBusinessDay(date)) continue;
    const key = weekKey(date);
    const days = map.get(key) ?? new Set<number>();
    days.add(date.getDay());
    map.set(key, days);
  }
  return map;
}

export function computeAttendanceStreak(records: AttendanceRecord[], weeksToShow = 6): AttendanceStreak {
  const weekMap = groupBusinessDaysByWeek(records);
  const currentWeekStart = startOfWeek(new Date());
  const currentWeekDays = weekMap.get(weekKey(currentWeekStart))?.size ?? 0;
  const currentWeekGoalMet = currentWeekDays >= WEEKLY_ATTENDANCE_GOAL;

  // La racha cuenta semanas consecutivas que cumplen el objetivo, hacia atrás desde
  // la semana en curso (si ya lo cumplió) o desde la última semana completa.
  let streakWeeks = 0;
  const cursor = new Date(currentWeekStart);
  if (!currentWeekGoalMet) cursor.setDate(cursor.getDate() - 7);
  while (true) {
    const days = weekMap.get(weekKey(cursor))?.size ?? 0;
    if (days < WEEKLY_ATTENDANCE_GOAL) break;
    streakWeeks++;
    cursor.setDate(cursor.getDate() - 7);
  }

  const recentWeeks: WeekSummary[] = [];
  const rollingWeek = new Date(currentWeekStart);
  for (let i = 0; i < weeksToShow; i++) {
    const days = weekMap.get(weekKey(rollingWeek))?.size ?? 0;
    recentWeeks.unshift({ weekStart: new Date(rollingWeek), days, goalMet: days >= WEEKLY_ATTENDANCE_GOAL });
    rollingWeek.setDate(rollingWeek.getDate() - 7);
  }

  return { streakWeeks, currentWeekDays, currentWeekGoalMet, recentWeeks };
}

export function attendanceWeekdayLabel(date: Date): string {
  return WEEKDAY_LABELS[date.getDay()];
}

export function attendanceStreakMessage(streak: AttendanceStreak): string {
  const missing = WEEKLY_ATTENDANCE_GOAL - streak.currentWeekDays;

  if (streak.streakWeeks === 0) {
    if (streak.currentWeekDays === 0) return 'Aún no hay asistencias esta semana. ¡Empieza hoy la racha!';
    if (streak.currentWeekGoalMet) return '¡Cumplió el objetivo de esta semana! Así se empieza una racha.';
    return `Lleva ${streak.currentWeekDays}/${WEEKLY_ATTENDANCE_GOAL} días esta semana. Le faltan ${missing} para lograr su primera racha.`;
  }

  const weeksLabel = streak.streakWeeks === 1 ? 'semana' : 'semanas';
  if (streak.currentWeekGoalMet) {
    return `Racha de ${streak.streakWeeks} ${weeksLabel} cumpliendo ${WEEKLY_ATTENDANCE_GOAL}+ días entre semana. ¡Sigue así!`;
  }
  return `Racha de ${streak.streakWeeks} ${weeksLabel} cumpliendo ${WEEKLY_ATTENDANCE_GOAL}+ días entre semana. Le faltan ${missing} días esta semana para extenderla.`;
}
