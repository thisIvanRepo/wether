import type { HourlyPoint } from '../api/openMeteo';
import { hourLabel, mm, round, weekday } from './format';
import {
  KIND_LABEL,
  WET_THRESHOLD,
  analyzePrecipitation,
  cumulative,
  intensityLabel,
  precipKind,
  probabilityWord,
} from './precipitation';

/** Plain-language sentences about precipitation at hour `i`. */
export function describePrecipHour(hourly: HourlyPoint[], i: number): string[] {
  const h = hourly[i];
  if (!h) return [];
  const lines: string[] = [];
  const at = i === 0 ? 'Зараз' : `О ${hourLabel(h.time)}`;
  const prob = round(h.precipitationProbability);
  const kind = precipKind(h);
  const sums = cumulative(hourly);

  if (kind) {
    const amount = h.snowfall > 0 && kind === 'snow' ? `${mm(h.snowfall)} см снігу` : `${mm(h.precipitation)} мм`;
    lines.push(
      `${at} — ${KIND_LABEL[kind].toLowerCase()}, ${amount} за годину (${intensityLabel(h.precipitation)}), ` +
        `ймовірність ${prob}% — ${probabilityWord(prob)}.`,
    );

    const period = analyzePrecipitation(hourly).periods.find(
      (p) => p.startTime <= h.time && h.time < p.endTime,
    );
    if (period) {
      lines.push(
        period.hours === 1
          ? `Це короткі опади — лише одну годину.`
          : `Опади тривають ${hourLabel(period.startTime)}–${hourLabel(period.endTime)}, ` +
              `всього ${mm(period.total)} мм, найсильніше о ${hourLabel(period.peakTime)}.`,
      );
    }
  } else {
    lines.push(
      `${at} опадів не очікується` +
        (prob >= 30
          ? `, хоча модель дає ${prob}% шансу — можливі короткочасні опади.`
          : ` (ймовірність ${prob}%).`),
    );

    const next = hourly.slice(i + 1).find((x) => x.precipitation >= WET_THRESHOLD);
    if (next) {
      const nk = precipKind(next);
      const day = next.time.slice(0, 10) !== hourly[0].time.slice(0, 10) ? ` (${weekday(next.time)})` : '';
      lines.push(
        `Найближчі опади — о ${hourLabel(next.time)}${day}: ${nk ? KIND_LABEL[nk].toLowerCase() : 'опади'}, ` +
          `${mm(next.precipitation)} мм.`,
      );
    } else {
      lines.push(`До кінця прогнозу (${hourly.length} год) після цієї години опадів не буде.`);
    }
  }

  if (i > 0 && sums[i] >= WET_THRESHOLD) {
    lines.push(`Від зараз до ${hourLabel(h.time)} включно випаде ${mm(sums[i])} мм.`);
  }
  return lines;
}
