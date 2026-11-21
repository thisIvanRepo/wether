/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Glass-on-gradient palette (see src/theme.ts for JS-side values).
        glass: {
          DEFAULT: 'rgba(255,255,255,0.12)',
          strong: 'rgba(255,255,255,0.20)',
          border: 'rgba(255,255,255,0.18)',
        },
        ink: {
          DEFAULT: '#ffffff',
          muted: 'rgba(255,255,255,0.72)',
          faint: 'rgba(255,255,255,0.50)',
          dark: '#1d3557',
        },
        accent: '#ffd166',
        rain: '#5ab4ff',
      },
      borderRadius: {
        card: '22px',
      },
    },
  },
  plugins: [],
};
