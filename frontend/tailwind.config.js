/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:              'rgb(var(--bg-rgb) / <alpha-value>)',
        surface:         'var(--sidebar)',
        border:          'var(--border)',
        'border-subtle': 'var(--border-subtle)',
        accent:          'rgb(var(--accent-rgb) / <alpha-value>)',
        'accent-dim':    'rgb(var(--accent-rgb) / 0.12)',
        'accent-border': 'rgb(var(--accent-rgb) / 0.25)',
        muted:           'var(--muted)',
        'text-primary':  'var(--text-primary)',
        'text-secondary':'var(--text-secondary)',
        dim:             'rgb(var(--dim-rgb) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans:    ['Inter', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
      },
      animation: {
        'fade-up':    'fade-up 0.4s ease forwards',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
