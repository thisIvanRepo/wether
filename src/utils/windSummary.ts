import type { HourlyPoint } from '../api/openMeteo';
import { ms } from './format';
import {
  WIND_HEIGHTS,
  angleBetween,
  directionFrom,
  directionName,
  windLevel,
  type Wind,
} from './windProfile';

/** "у 2 рази", "у 5 разів", "у 4,9 раза" */
function times(ratio: number) {
  const r = Math.round(ratio * 10) / 10;
  const text = String(r).replace('.', ',');
  if (!Number.isInteger(r)) return `у ${text} раза`;
  const mod10 = r % 10;
  const mod100 = r % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `у ${text} рази`;
  return `у ${text} разів`;
}

/** A few plain-language sentences about the wind profile for one hour. */
export function describeWindHour(h: HourlyPoint): string[] {
  const lines: string[] = [];
  const ground = h.wind10;
  const aloft = WIND_HEIGHTS.map((height, i) => ({ height, wind: h.windProfile[i] })).filter(
    (l): l is { height: (typeof WIND_HEIGHTS)[number]; wind: Wind } => l.wind !== null,
  );

  if (ground) {
    lines.push(
      `Біля землі — ${windLevel(ground.speed).label.toLowerCase()} ${directionName(ground.direction)} вітер ` +
        `${ms(ground.speed)} м/с, пориви до ${ms(h.windGusts)} м/с.`,
    );
  }

  if (aloft.length) {
    const strongest = aloft.reduce((a, b) => (b.wind.speed > a.wind.speed ? b : a));
    const ratio = ground && ground.speed >= 0.5 ? strongest.wind.speed / ground.speed : 0;
    lines.push(
      `Найсильніше — на ${strongest.height} м: ${ms(strongest.wind.speed)} м/с ` +
        `(${windLevel(strongest.wind.speed).label.toLowerCase()})` +
        (ratio >= 1.5 ? `, ${times(ratio)} сильніше, ніж біля землі.` : '.'),
    );

    const top = aloft[aloft.length - 1];
    if (ground && angleBetween(ground.direction, top.wind.direction) >= 30) {
      lines.push(
        `З висотою вітер повертає: біля землі дме ${directionFrom(ground.direction)}, ` +
          `а на ${top.height} м — ${directionFrom(top.wind.direction)}.`,
      );
    } else if (ground) {
      lines.push(`Напрям з висотою майже не змінюється — ${directionName(ground.direction)}.`);
    }
  }

  return lines;
}
