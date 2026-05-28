/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0b0b0c',
          900: '#101012',
          850: '#141416',
          800: '#1a1a1d',
          750: '#1f1f23',
          700: '#26262b',
          600: '#33333a',
          500: '#4a4a52',
          400: '#6b6b75',
          300: '#9a9aa3',
          200: '#c7c7cc',
          100: '#e9e9ec',
        },
        accent: {
          DEFAULT: '#c98a5b',
          soft: '#e0a87a',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          '"Inter"',
          'system-ui',
          'sans-serif',
        ],
        mono: ['"SF Mono"', '"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.5)',
        floating:
          '0 24px 60px -20px rgba(0,0,0,0.6), 0 6px 16px -8px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
        popover:
          '0 18px 48px -16px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
      },
      keyframes: {
        slideAwayUp: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-24px)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        slideAwayUp: 'slideAwayUp 360ms cubic-bezier(0.4,0,0.2,1) forwards',
        fadeIn: 'fadeIn 280ms cubic-bezier(0.4,0,0.2,1) both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};
