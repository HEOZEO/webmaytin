/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff0f2',
          100: '#ffe0e6',
          500: '#ff0029',
          600: '#e60025',
          700: '#cc0021',
          800: '#990019',
          900: '#660010',
        },
        rog: {
          black: '#000000',
          dark: '#111111',
          red: '#ff0029',
          neon: '#ff0029',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        rog: ['Oswald', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
