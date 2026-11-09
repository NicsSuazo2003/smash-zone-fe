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
        /* ─────────────────────────────────────────────
         * PRIMARY — Championship Red (from "POINT" & velocity arcs)
         * ───────────────────────────────────────────── */
        primary: {
          50:  '#FFF1F2',
          100: '#FFE1E4',
          200: '#FFC7CD',
          300: '#FFA0AA',
          400: '#F86475',
          500: '#ED1C24', // Core Brand Red
          600: '#D20D1A',
          700: '#B00714',
          800: '#920A15',
          900: '#7A0E16',
          950: '#430206',
        },
        // Backwards compatibility aliases remapped to Red
        court: {
          50:  '#FFF1F2', 100: '#FFE1E4', 200: '#FFC7CD', 300: '#FFA0AA',
          400: '#F86475', 500: '#ED1C24', 600: '#D20D1A', 700: '#B00714',
          800: '#920A15', 900: '#7A0E16', 950: '#430206',
        },
        'brand-blue': {
          50:  '#FFF1F2', 100: '#FFE1E4', 200: '#FFC7CD', 300: '#FFA0AA',
          400: '#F86475', 500: '#ED1C24', 600: '#D20D1A', 700: '#B00714',
          800: '#920A15', 900: '#7A0E16', 950: '#430206',
        },

        /* ─────────────────────────────────────────────
         * NEUTRAL — Carbon Pitch (Dark Mode Surfaces & Deep Blacks)
         * ───────────────────────────────────────────── */
        neutral: {
          50:  '#F4F5F7',
          100: '#E3E5EB',
          200: '#C7CBD4',
          300: '#A4ABB9',
          400: '#7A8395',
          500: '#5B6476',
          600: '#454C5B',
          700: '#313642',
          800: '#1D2028',
          900: '#111317', // Cards & elevated panels
          950: '#0A0B0D', // Base page canvas
        },
        // Alias `forest` remapped to Carbon so dark containers remain stable
        forest: {
          50:  '#F4F5F7', 100: '#E3E5EB', 200: '#C7CBD4', 300: '#A4ABB9',
          400: '#7A8395', 500: '#5B6476', 600: '#454C5B', 700: '#313642',
          800: '#1D2028', 900: '#111317', 950: '#0A0B0D',
        },

        /* ─────────────────────────────────────────────
         * ACCENT — Optic Court Gold (from official ball)
         * ───────────────────────────────────────────── */
        accent: {
          50:      '#FFFAEB',
          100:     '#FFF2C6',
          200:     '#FFE588',
          300:     '#FFD443',
          400:     '#FFC21A',
          500:     '#FFB703', // Official Pickleball Gold
          600:     '#E09200',
          700:     '#B26902',
          800:     '#8F510A',
          900:     '#76420D',
          950:     '#442203',
          DEFAULT: '#FFB703',
          light:   '#FFD443',
          dark:    '#E09200',
          muted:   '#FFB70320',
        },
        // Aliases remapped to Gold
        accentGreen: {
          50:  '#FFFAEB', 100: '#FFF2C6', 200: '#FFE588', 300: '#FFD443',
          400: '#FFC21A', 500: '#FFB703', 600: '#E09200', 700: '#B26902',
          800: '#8F510A', 900: '#76420D', 950: '#442203',
        },
        gold: {
          50:  '#FFFAEB', 100: '#FFF2C6', 200: '#FFE588', 300: '#FFD443',
          400: '#FFC21A', 500: '#FFB703', 600: '#E09200', 700: '#B26902',
          800: '#8F510A', 900: '#76420D', 950: '#442203',
        },

        /* ─────────────────────────────────────────────
         * CREAM / OFF-WHITE — Clean Silver White
         * ───────────────────────────────────────────── */
        cream: {
          DEFAULT: '#FFFFFF',
          dark:    '#EEF2F6',
          muted:   '#7A8395',
          50:      '#FFFFFF',
          100:     '#F8FAFC',
          200:     '#EEF2F6',
          300:     '#DCE2EA',
          400:     '#C3CBD6',
          500:     '#9AA5B5',
          600:     '#707C8E',
          700:     '#4F5968',
          800:     '#333A44',
          900:     '#1E232B',
          950:     '#0F1216',
        },

        /* ─────────────────────────────────────────────
         * CANVAS
         * ───────────────────────────────────────────── */
        charcoal: '#0A0B0D',

        /* ─────────────────────────────────────────────
         * SEMANTIC
         * ───────────────────────────────────────────── */
        success: {
          50:      '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 300: '#6EE7B7',
          400:     '#34D399', 500: '#10B981', 600: '#059669', 700: '#047857',
          800:     '#065F46', 900: '#064E3B', 950: '#022C22',
          DEFAULT: '#10B981',
        },
        error: {
          50:      '#FFF1F2', 100: '#FFE1E4', 200: '#FFC7CD', 300: '#FFA0AA',
          400:     '#F86475', 500: '#ED1C24', 600: '#D20D1A', 700: '#B00714',
          800:     '#920A15', 900: '#7A0E16', 950: '#430206',
          DEFAULT: '#ED1C24',
        },
        warning: {
          50:      '#FFFAEB', 100: '#FFF2C6', 200: '#FFE588', 300: '#FFD443',
          400:     '#FFC21A', 500: '#FFB703', 600: '#E09200', 700: '#B26902',
          800:     '#8F510A', 900: '#76420D', 950: '#442203',
          DEFAULT: '#FFB703',
        },

        brand: {
          red:     '#ED1C24',
          redHover:'#D20D1A',
          redDeep: '#920A15',
          gold:    '#FFB703',
        },
      },

      boxShadow: {
        'glow-primary':  '0 0 20px -3px rgba(237, 28, 36, 0.45)',
        'glow-accent':   '0 0 20px -3px rgba(255, 183, 3, 0.45)',
        'glow-court':    '0 0 20px -3px rgba(237, 28, 36, 0.45)',
        'glow-blue':     '0 0 20px -3px rgba(237, 28, 36, 0.45)',
        'glow-green':    '0 0 20px -3px rgba(255, 183, 3, 0.45)',
        'glow-lime':     '0 0 20px -3px rgba(255, 183, 3, 0.45)',
        'card-elevated': '0 12px 32px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.04)',
      },
    },
  },
  plugins: [],
};