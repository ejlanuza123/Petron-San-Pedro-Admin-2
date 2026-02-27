/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        petron: {
          blue: '#0033A0',
          'blue-dark': '#002A80',
          'blue-light': '#E6ECF5',
          red: '#ED1C24',
          'red-dark': '#C01018',
          'red-light': '#FDE6E7',
          yellow: '#FFD700', // Optional: Petron's accent yellow
        }
      },
      backgroundImage: {
        'petron-gradient': 'linear-gradient(135deg, #0033A0 0%, #ED1C24 100%)',
        'petron-gradient-subtle': 'linear-gradient(135deg, #E6ECF5 0%, #FDE6E7 100%)',
      }
    },
  },
  plugins: [],
}