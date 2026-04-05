import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── GG Tracker Design System ──
        // Deep Purple (brand primary)
        primary: {
          DEFAULT: '#46265F',
          50:  '#f5eeff',
          100: '#ead5ff',
          200: '#d4a8ff',
          300: '#b87aee',
          400: '#9a52d6',
          500: '#7f35be',
          600: '#6A3D8F',   // Vivid Purple — accent / hover
          700: '#46265F',   // Deep Purple — brand primary
          800: '#361d4a',
          900: '#221033',
          950: '#120820',
        },

        // ── Backgrounds ──
        background: {
          DEFAULT: '#0F0F11',
          dark:    '#0F0F11',   // Near Black — page background
          card:    '#1C1C1F',   // Dark Surface — cards / containers
          hover:   '#222226',   // Slightly lighter for hover
        },

        // ── Border ──
        border: {
          DEFAULT: '#2D2D32',
          dark:    '#2D2D32',   // Border Grey — static borders
          accent:  '#6A3D8F',   // Vivid Purple — hover border
        },

        // ── Text ──
        text: {
          primary:   '#F8F8FF',  // Ghost White
          secondary: '#80808A',  // Muted Grey
          muted:     '#80808A',
          accent:    '#c4a0e8',  // Accent foreground
        },

        // ── Semantic ──
        success:     '#22C55E',
        danger:      '#DC2626',
        warning:     '#eab308',
        info:        '#06b6d4',

        // ── Accent (Vivid Purple) ──
        accent: {
          DEFAULT: '#6A3D8F',
        },
      },

      backgroundColor: {
        page:  'hsl(var(--color-background))',
        card:  'hsl(var(--color-card))',
        input: 'hsl(var(--color-input))',
      },

      textColor: {
        foreground: 'hsl(var(--color-foreground))',
        muted:      'hsl(var(--color-muted))',
      },

      borderColor: {
        DEFAULT: 'hsl(var(--color-border))',
      },

      // ── Typography ──
      fontFamily: {
        // Space Mono — headings, data, display
        mono: ['var(--font-space-mono)', 'Space Mono', 'monospace'],
        // DM Sans — body, UI, labels
        sans: ['var(--font-dm-sans)', 'DM Sans', 'sans-serif'],
      },

      fontSize: {
        xs:   ['0.75rem',  { lineHeight: '1rem' }],
        sm:   ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem',     { lineHeight: '1.6rem' }],
        lg:   ['1.125rem', { lineHeight: '1.75rem' }],
        xl:   ['1.25rem',  { lineHeight: '1.75rem' }],
        '2xl':['1.5rem',   { lineHeight: '2rem' }],
        '3xl':['1.875rem', { lineHeight: '2.25rem' }],
        '4xl':['2.25rem',  { lineHeight: '2.5rem' }],
        '5xl':['3rem',     { lineHeight: '1.1' }],
        '6xl':['3.75rem',  { lineHeight: '1.1' }],
      },

      // ── Spacing ──
      spacing: {
        sidebar:           '16rem',
        'sidebar-collapsed': '4.5rem',
      },

      // ── Border Radius ──
      borderRadius: {
        DEFAULT: '0.5rem',   // 8px — card base
        sm:      '0.375rem', // 6px
        md:      '0.5rem',   // 8px
        lg:      '0.75rem',  // 12px — elevated sections
        xl:      '1rem',
        full:    '9999px',
      },

      // ── Animations ──
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'count-up':   'countUp 0.6s ease-out',
      },

      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        slideDown: {
          '0%':   { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.5' },
        },
        countUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },

      // ── Box Shadows ── (no morbide SaaS shadows — solo glow viola)
      boxShadow: {
        sm:   '0 1px 2px 0 rgb(0 0 0 / 0.3)',
        base: '0 1px 3px 0 rgb(0 0 0 / 0.4)',
        md:   '0 4px 6px -1px rgb(0 0 0 / 0.4)',
        lg:   '0 10px 15px -3px rgb(0 0 0 / 0.4)',

        // Glow viola — GG Tracker brand
        'glow-primary':        '0 0 20px rgba(106, 61, 143, 0.3)',
        'glow-primary-strong': '0 0 40px rgba(106, 61, 143, 0.6), 0 0 80px rgba(106, 61, 143, 0.2)',
        'purple-glow':         '0 0 20px rgba(106, 61, 143, 0.3)',
        'purple-glow-lg':      '0 0 40px rgba(106, 61, 143, 0.4)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
};

export default config;
