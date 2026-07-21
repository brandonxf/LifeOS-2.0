/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Marca: lima neón / chartreuse — acento eléctrico sobre fondo casi-negro.
        primary: {
          DEFAULT: '#37e779',
          50: '#e7fdf0',
          100: '#c6fadb',
          200: '#8ff3b8',
          300: '#37e779',
          400: '#1fd268',
          500: '#15b657',
          600: '#0f9448',
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
        glow: '0 0 0 1px rgba(55,231,121,0.20), 0 8px 30px -6px rgba(55,231,121,0.35)',
        glass:
          'inset 0 1px 0 0 rgba(255,255,255,0.06), 0 24px 50px -28px rgba(0,0,0,0.75)',
        'glass-lg':
          'inset 0 1px 0 0 rgba(255,255,255,0.08), 0 40px 80px -40px rgba(0,0,0,0.85)',
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
