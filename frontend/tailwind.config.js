/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#f6f7f6',
          100: '#e3e8e3',
          200: '#c7d1c7',
          300: '#a3b4a3',
          400: '#7e967e',
          500: '#627862',
          600: '#4d5f4d',
          700: '#3f4d3f',
          800: '#354035',
          900: '#2d362d',
        },
        lavender: {
          50: '#faf8fc',
          100: '#f3eef8',
          200: '#e9dff3',
          300: '#d7c4e8',
          400: '#c0a0d9',
          500: '#a77ec7',
          600: '#8f61ae',
          700: '#774e91',
          800: '#634277',
          900: '#533862',
        },
        gold: {
          50: '#fefdfb',
          100: '#fdf9f1',
          200: '#faf1e1',
          300: '#f5e3c6',
          400: '#eecd9f',
          500: '#e5b276',
          600: '#d8954f',
          700: '#c27a3b',
          800: '#a16333',
          900: '#83512d',
        }
      }
    },
  },
  plugins: [],
}
