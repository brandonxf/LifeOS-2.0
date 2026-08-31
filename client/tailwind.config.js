/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Marca: acento personalizable (lima por defecto) — ver [data-accent]
        // en index.css. DEFAULT/200/400/600 leen variables CSS; el resto de
        // paradas se usa poco y se deja fija.
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          50: '#e7fdf0',
          100: '#c6fadb',
          200: 'rgb(var(--primary-200) / <alpha-value>)',
          300: '#37e779',
          400: 'rgb(var(--primary-400) / <alpha-value>)',
          500: '#15b657',
          600: 'rgb(var(--primary-600) / <alpha-value>)',
          700: '#11753d',
          800: '#135c33',
          900: '#124c2c',
          950: '#04260f',
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
        glow: '0 0 0 1px rgb(var(--primary) / 0.20), 0 8px 30px -6px rgb(var(--primary) / 0.35)',
        glass:
          'inset 0 1px 0 0 rgba(255,255,255,0.06), 0 24px 50px -28px rgba(0,0,0,0.75)',
        'glass-lg':
          'inset 0 1px 0 0 rgba(255,255,255,0.08), 0 40px 80px -40px rgba(0,0,0,0.85)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'page-in': { from: { opacity: 0, transform: 'translateY(18px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'page-in': 'page-in 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
