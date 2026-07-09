/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Marca: iris / cobalto — reemplaza el violeta SaaS por defecto.
        primary: {
          DEFAULT: '#5A4FE0',
          50: '#eef0ff',
          100: '#e0e3ff',
          200: '#c7ccff',
          300: '#a5abfb',
          400: '#8688f6',
          500: '#6d68ee',
          600: '#5A4FE0',
          700: '#4a3fc4',
          800: '#3d359e',
          900: '#35317d',
          950: '#211d4a',
        },
        // Fondo "ink": azul-negro cálido, más profundo que slate puro.
        ink: {
          950: '#0a0b14',
          900: '#12131f',
          850: '#171826',
          800: '#1e2032',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#F43F5E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(90,79,224,0.15), 0 8px 30px -6px rgba(90,79,224,0.35)',
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
