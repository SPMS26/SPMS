/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgMain: '#0c0f17',
        bgSidebar: '#111520',
        bgCard: '#161c2b',
        bgCardHover: '#1c2438',
        bgInput: '#131826',
        borderSubtle: '#232d42',
        borderBright: '#354360',
        accentGold: '#f59e0b',
        accentEmerald: '#10b981',
        statusAvailable: '#10b981',
        statusReserved: '#f59e0b',
        statusOccupied: '#ef4444',
        statusMaintenance: '#6b7280'
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Outfit', 'sans-serif']
      }
    },
  },
  plugins: [],
}
