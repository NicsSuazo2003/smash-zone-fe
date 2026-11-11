/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Barlow Condensed', 'Inter', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },

      colors: {
        brand: {
          purple: {
            DEFAULT: '#3D1164',
            light: '#5A1B91',
            dark: '#260B3E',
          },
          orange: {
            DEFAULT: '#FF7A00',
            light: '#FFAA6B',
            dark: '#E06B00',
          },
          gold: {
            DEFAULT: '#FFA81A',
            hover: '#F0990A',
          },
          black: '#0D0E12',
        },

        primary: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#A855F7',
          500: '#5A1B91',
          600: '#3D1164',
          700: '#2E0C4C',
          800: '#220838',
          900: '#170526',
          DEFAULT: '#3D1164',
        },

        accent: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#FF7A00',
          600: '#EA580C',
          700: '#C2410C',
          DEFAULT: '#FF7A00',
        },
      },

      boxShadow: {
        'card-clean': '0 4px 20px -2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 10px 25px -4px rgba(61, 17, 100, 0.1), 0 4px 10px -2px rgba(15, 23, 42, 0.05)',
        'orange-glow': '0 4px 16px rgba(255, 122, 0, 0.35)',
        'purple-glow': '0 4px 16px rgba(61, 17, 100, 0.3)',
      },
    },
  },
  plugins: [],
};