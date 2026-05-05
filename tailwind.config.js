/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Override rose scale → kept for legacy usage
        rose: {
          50:  '#fff5f8',
          100: '#FFDBE5',
          200: '#f7c8d8',
          300: '#EA9AB2',
          400: '#e88aaa',
          500: '#E27396',
          600: '#d45c82',
          700: '#c44d73',
          800: '#9d3259',
          900: '#7a2245',
          950: '#4d1430',
        },
        // Soft pastel brand palette
        brand: {
          pink: '#F9D5E5',
          'pink-dark': '#F0A8C4',
          green: '#D4EDDA',
          'green-dark': '#A8D5B5',
          white: '#FFFFFF',
          'off-white': '#F8FAFB',
          // Numeric scale retained so existing brand-50/500/600 references keep working
          50:  '#f0f7f2',
          100: '#d1ead4',
          200: '#a8d4ae',
          300: '#6D9F71',
          400: '#5a9160',
          500: '#337357',
          600: '#285e46',
          700: '#1e4a37',
          800: '#163828',
          900: '#0d2419',
          950: '#071510',
        },
      },
    },
  },
  plugins: [],
}
