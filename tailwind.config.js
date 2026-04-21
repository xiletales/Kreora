/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Override rose scale → new pink palette
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
        // New brand green
        brand: {
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
