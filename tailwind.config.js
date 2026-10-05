/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand Palette & Hex Tokens
        white: '#ffffff',
        'orange-400': '#f08418',
        'blue-950': '#16324f',
        'neutral-100': '#e2e8f0',
        'slate-600': '#64748b',
        'green-600': '#138808',
        'slate-950': '#1f2933',
        'orange-300': '#ff9933',
        'slate-900': '#3a4753',
        'slate-800': '#42505c',
        'lime-500': '#7a9e2e',

        // Semantic UI Roles
        background: 'var(--background, #ffffff)',
        foreground: 'var(--foreground, #1f2933)',
        'muted-foreground': 'var(--muted-foreground, #64748b)',
        primary: 'var(--primary, #f08418)',
        accent: 'var(--accent, #16324f)',
        border: 'var(--border, #e2e8f0)',
        warning: 'var(--warning, #f08418)',
        success: 'var(--success, #138808)',

        // Preserved Legacy Brand Palette
        brand: {
          50: '#eff1f6',
          100: '#e3e5eb',
          200: '#dddddd',
          300: '#cccccc',
          500: '#f15a24',
          600: '#cf2e2e',
          800: '#555555',
          900: '#41454f',
          950: '#212327',
        }
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'Arial', 'sans-serif'],
        'sans-2': ['Sora', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        'sans-3': ['Sora', 'sans-serif'],
      },
      fontSize: {
        xs: '.8rem',
        sm: '.88rem',
        base: '.95rem',
        lg: '1.15rem',
        xl: '1.35rem',
      },
      spacing: {
        '2px': '2px',
        '3_2px': '3.2px',
        '9_6px': '9.6px',
        '10px': '10px',
        '14px': '14px',
        '18px': '18px',
        '22px': '22px',
        '26px': '26px',
        '30px': '30px',
        '34px': '34px',
      },
      borderRadius: {
        lg: '8px',
        xl: '14px',
        '3xl': '99px',
      },
      boxShadow: {
        xs: '0 2px 10px rgba(240,132,24,.35)',
      }
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [
    require('tailwindcss-animate'),
    require('tailwindcss-elevation'),
    require('tailwindcss-fluid-type')
  ],
}
