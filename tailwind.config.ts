import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

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
        // Colori primari
        primary: {
          50: '#faf5ff',
          100: '#f5ebff',
          200: '#ead5ff',
          300: '#d9a8ff',
          400: '#c77dff',
          500: '#b744ff',
          600: '#9e00ff',
          700: '#7f00ff',
          800: '#6c00db',
          900: '#5a00b8',
          950: '#360066',
        },
        // Sfondi scuri
        background: {
          dark: '#0a0a0f',
          darker: '#050507',
          card: '#12121a',
          hover: '#18181f',
        },
        // Bordi e separatori
        border: {
          dark: '#1e1e2e',
          darker: '#16161e',
          light: '#2d2d3d',
        },
        // Testo
        text: {
          primary: '#ffffff',
          secondary: '#a8a8b8',
          tertiary: '#72727a',
          muted: '#4a4a52',
        },
        // Stato
        success: '#22c55e',
        danger: '#ef4444',
        warning: '#eab308',
        info: '#06b6d4',
      },
      backgroundColor: {
        page: 'hsl(var(--color-background))',
        card: 'hsl(var(--color-card))',
        input: 'hsl(var(--color-input))',
      },
      textColor: {
        foreground: 'hsl(var(--color-foreground))',
        muted: 'hsl(var(--color-muted))',
      },
      borderColor: {
        DEFAULT: 'hsl(var(--color-border))',
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', ...defaultTheme.fontFamily.sans],
        mono: ['var(--font-geist-mono)', ...defaultTheme.fontFamily.mono],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        sidebar: '16rem',
        'sidebar-collapsed': '4rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        base: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
        'purple-glow': '0 0 20px rgba(127, 0, 255, 0.3)',
        'purple-glow-lg': '0 0 30px rgba(127, 0, 255, 0.2)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
};

export default config;
