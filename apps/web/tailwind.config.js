/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}", "./src/app/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          base:    '#0a0a0a',
          subtle:  '#111111',
          muted:   '#1a1a1a',
          overlay: '#222222',
          border:  '#2a2a2a',
        },
        fg: {
          default:  '#ededed',
          muted:    '#a1a1a1',
          subtle:   '#666666',
          disabled: '#3a3a3a',
        },
        accent: {
          DEFAULT:  '#ffffff',
          muted:    '#d4d4d4',
          subtle:   '#404040',
        },
        semantic: {
          success: '#4ade80',
          warning: '#facc15',
          error:   '#f87171',
          info:    '#60a5fa',
        },
      },
      fontFamily: {
        sans: ['Geist', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"Geist Mono"', '"Fira Code"', 'monospace'],
      },
      fontSize: {
        '2xs': '11px',
        xs:    '12px',
        sm:    '13px',
        base:  '14px',
        md:    '16px',
        lg:    '20px',
        xl:    '24px',
        '2xl': '32px',
        '3xl': '48px',
        '4xl': '64px',
      },
      spacing: {
        '4.5': '18px',
        '5.5': '22px',
      },
      borderRadius: {
        sm:  '4px',
        md:  '6px',
        lg:  '8px',
        xl:  '12px',
        '2xl': '16px',
        full: '9999px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
