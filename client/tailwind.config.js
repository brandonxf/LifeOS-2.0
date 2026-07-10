/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Marca: lima neón / chartreuse — acento eléctrico sobre fondo casi-negro.
        primary: {
          DEFAULT: '#c4f82a',
          50: '#f7ffe0',
          100: '#ecffb8',
          200: '#dcff85',
          300: '#c4f82a',
          400: '#b2e81a',
          500: '#97c910',
          600: '#78a10c',
          700: '#5d7c10',
          800: '#4a6113',
          900: '#3e5215',
          950: '#1f2c05',
        },
        // Fondo "ink": casi-negro con un leve tinte verde-carbón.
        ink: {
          950: '#080a08',
          900: '#0e110e',
          850: '#141814',
          800: '#1b201b',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#F43F5E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(196,248,42,0.20), 0 8px 30px -6px rgba(196,248,42,0.35)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
