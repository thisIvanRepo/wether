const WEEKDAYS = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export const round = (n: number) => Math.round(n);

/** "2026-11-21T14:00" -> "14:00" */
export const hourLabel = (iso: string) => iso.slice(11, 16);

/** "2026-11-21T14:00" -> "14" */
export const hourShort = (iso: string) => iso.slice(11, 13);

/** Weekday from a local "YYYY-MM-DD[...]" string (no timezone shifts). */
export function weekday(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

/** Millimetres: one decimal below 10, whole numbers above. */
export function mm(value: number) {
  return value < 10 ? value.toFixed(1) : value.toFixed(0);
}

/** Wind speed in m/s, one decimal below 10. */
export function ms(value: number) {
  return value < 10 ? value.toFixed(1) : value.toFixed(0);
}
