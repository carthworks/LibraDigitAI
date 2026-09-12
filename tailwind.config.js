/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
      }
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('tailwindcss-elevation'),
    require('tailwindcss-fluid-type')
  ],
}
