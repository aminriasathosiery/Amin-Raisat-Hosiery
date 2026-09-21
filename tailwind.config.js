/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      xs: '375px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        brand: {
          navy: '#23384D',
          'navy-dark': '#182B3D',
          gold: '#C99A3D',
          'gold-light': '#D9B15C',
          cream: '#F7F3EA',
          white: '#FFFFFF',
          beige: '#EEE8DC',
          text: '#1D2730',
          muted: '#66717C',
          border: '#D8D0C3',
          success: '#2F7D5A',
          error: '#B8423A',
        },
        light: {
          bg: '#F7F3EA',
          elevated: '#EEE8DC',
          hover: '#E8E1D3',
          border: '#D8D0C3',
        },
        charcoal: {
          950: '#111827',
          900: '#1D2730',
          800: '#23384D',
          700: '#334155',
          600: '#475569',
          500: '#66717C',
          400: '#8E8A80',
          300: '#CBD5E1',
          200: '#E2E8F0',
          100: '#F1F5F9',
          50: '#F8FAFC',
        },
        champagne: {
          500: '#C99A3D',
          400: '#D9B15C',
          300: '#E4C985',
          200: '#EEDDAE',
          100: '#F7F0D8',
          50: '#FAF6EE',
        },
        status: {
          success: '#2E9F68',
          warning: '#C9933B',
          danger: '#D05A5A',
        },
        whatsapp: '#25D366',
        'whatsapp-dark': '#128C7E',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.25s ease-out forwards',
        'slide-up': 'slideUp 0.25s ease-out forwards',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        pulseSubtle: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 4px 14px 0 rgba(37, 211, 102, 0.2)' },
          '50%': { transform: 'scale(1.02)', boxShadow: '0 6px 18px 2px rgba(37, 211, 102, 0.28)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        '2xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.08)',
        subtle: '0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        card: '0 4px 12px -2px rgba(0, 0, 0, 0.08)',
        elevation: '0 8px 30px rgba(0, 0, 0, 0.12)',
        'glow-primary': '0 4px 16px -2px rgba(184, 149, 85, 0.18)',
        'glow-whatsapp': '0 4px 14px 0 rgba(37, 211, 102, 0.25)',
        'glow-gold': '0 0 16px -2px rgba(184, 149, 85, 0.2)',
      },
    },
  },
  plugins: [],
};
