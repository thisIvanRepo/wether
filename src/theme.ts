export const colors = {
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.72)',
  faint: 'rgba(255,255,255,0.5)',
  card: 'rgba(255,255,255,0.12)',
  cardBorder: 'rgba(255,255,255,0.18)',
  chip: 'rgba(255,255,255,0.10)',
  chipActive: 'rgba(255,255,255,0.92)',
  chipActiveText: '#1d3557',
  accent: '#ffd166',
  rain: '#5ab4ff',
  showers: '#3f7cff',
  snow: '#e6f0ff',
  mixed: '#b9a3ff',
  probability: 'rgba(90,180,255,0.22)',
};

type Gradient = readonly [string, string, string];

/** Screen background based on the current weather. */
export function gradientFor(weatherCode: number, isDay: boolean): Gradient {
  if (!isDay) return ['#0b1630', '#16264a', '#24365e'];
  if (weatherCode >= 95) return ['#1f2430', '#33394a', '#4a5166'];
  if (weatherCode >= 71 && weatherCode <= 86 && weatherCode !== 80 && weatherCode !== 81 && weatherCode !== 82)
    return ['#4f6a8a', '#6f8bab', '#8fa8c4'];
  if (weatherCode >= 51) return ['#2d3e55', '#3d5573', '#4f6d8f'];
  if (weatherCode >= 45) return ['#5a6573', '#737f8c', '#8b96a1'];
  if (weatherCode === 3) return ['#4a6280', '#647c99', '#7f96b0'];
  return ['#1d5fb0', '#3a82d0', '#6aa9e6'];
}
